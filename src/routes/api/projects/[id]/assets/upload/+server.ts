import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import sharp from 'sharp';
import { waitUntil } from '@vercel/functions';
import { CDN_WORKER_URL, CDN_UPLOAD_SECRET, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { logAudit } from '$lib/audit';

// Buffer<ArrayBufferLike> no es asignable a BlobPart en los tipos de Bun/TS.
// Se copia a un Uint8Array<ArrayBuffer> limpio para satisfacer la restricción.
function toUint8(buf: Buffer): Uint8Array<ArrayBuffer> {
	const arr = new Uint8Array(buf.byteLength) as Uint8Array<ArrayBuffer>;
	arr.set(buf);
	return arr;
}

// Tipos que pasan por Sharp (variantes WebP)
const SHARP_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

// Tipos que se suben tal cual (sin procesamiento)
function isAllowedType(type: string): boolean {
	return SHARP_TYPES.has(type)
		|| type.startsWith('video/')
		|| type === 'application/pdf';
}

// El `type` de un File en FormData es el Content-Type declarado por el cliente —
// no está verificado contra el contenido real. Sin esto, cualquier payload (HTML/JS)
// etiquetado con un tipo de la allowlist pasa isAllowedType() y se sube al CDN público.
function bufferMatchesDeclaredType(buf: Buffer, declaredType: string): boolean {
	const isJpeg      = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
	const isPng       = buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
	const isWebp      = buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
	const isPdf       = buf.length >= 5 && buf.toString('ascii', 0, 5) === '%PDF-';
	const isMp4Family = buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp';
	const isWebm      = buf.length >= 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3;

	if (declaredType === 'image/jpeg' || declaredType === 'image/jpg') return isJpeg;
	if (declaredType === 'image/png') return isPng;
	if (declaredType === 'image/webp') return isWebp;
	if (declaredType === 'application/pdf') return isPdf;
	if (declaredType.startsWith('video/')) return isMp4Family || isWebm;
	return false;
}

export const POST: RequestHandler = async ({ request, params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'No autenticado' }, { status: 401 });

	const { data: project } = await locals.supabase
		.from('projects')
		.select('id')
		.eq('id', params.id)
		.single();
	if (!project) return json({ error: 'Proyecto no encontrado' }, { status: 404 });

	const formData = await request.formData().catch(() => null);
	const file = formData?.get('file') as File | null;
	if (!file) return json({ error: 'Campo "file" requerido' }, { status: 400 });

	if (!isAllowedType(file.type)) {
		return json({ error: 'Tipo de archivo no admitido. Se aceptan imágenes JPG/PNG/WebP, videos y PDF' }, { status: 400 });
	}
	if (file.size > 200 * 1024 * 1024) {
		return json({ error: 'Tamaño máximo: 200 MB' }, { status: 400 });
	}

	const originalArrayBuffer = await file.arrayBuffer();

	if (!bufferMatchesDeclaredType(Buffer.from(originalArrayBuffer), file.type)) {
		return json({ error: 'El contenido del archivo no coincide con el tipo declarado' }, { status: 400 });
	}

	const baseName = file.name.replace(/\.[^.]+$/, '');

	// ── Fase 1: subir original al CDN ────────────────────────────────────────

	const cdnRes = await fetch(`${CDN_WORKER_URL}/upload`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${CDN_UPLOAD_SECRET}`,
			'X-Project-Id': params.id,
			'X-Filename': file.name,
			'X-Skip-Register': 'true',
			'Content-Type': file.type,
		},
		body: originalArrayBuffer,
	});

	if (!cdnRes.ok) {
		console.error('[assets/upload] CDN error (original):', await cdnRes.text());
		return json({ error: 'Error subiendo al CDN' }, { status: 502 });
	}

	let cdnData: { url: string; key: string };
	try {
		cdnData = await cdnRes.json() as { url: string; key: string };
		if (!cdnData.url || !cdnData.key) throw new Error('CDN response missing url/key');
	} catch {
		return json({ error: 'Error subiendo al CDN' }, { status: 502 });
	}
	const { url: originalUrl, key: originalKey } = cdnData;

	// INSERT en Supabase — para imágenes, key/url se actualizan en Phase 2 al WebP full
	const { data: inserted, error: dbErr } = await locals.supabase
		.from('assets')
		.insert({
			project_id: params.id,
			key: originalKey,
			url: originalUrl,
			original_key: originalKey,
			original_url: originalUrl,
			filename: file.name,
			mime_type: file.type,
			size_bytes: file.size,
			is_public: true,
		})
		.select('id, key, url, filename, mime_type, size_bytes, thumb_url, created_at')
		.single();

	if (dbErr || !inserted) {
		console.error('[assets/upload] Supabase insert error:', dbErr?.message);
		return json({ error: 'Error registrando asset' }, { status: 500 });
	}

	await logAudit({
		supabase: locals.supabase,
		projectId: params.id,
		userId: user.id,
		actor: user.email ?? 'desconocido',
		action: 'create',
		resourceType: 'asset',
		resourceId: inserted.id,
		resourceName: file.name,
	});

	// ── Fase 2: Sharp solo para imágenes píxel ────────────────────────────────

	if (SHARP_TYPES.has(file.type)) {
		const originalBuffer = Buffer.from(originalArrayBuffer);

		waitUntil((async () => {
			try {
				const [fullBuf, clusterBuf, thumbBuf] = await Promise.all([
					sharp(originalBuffer).webp({ quality: 85, effort: 4 }).toBuffer(),
					sharp(originalBuffer).resize({ width: 800, withoutEnlargement: true }).webp({ quality: 75, effort: 4 }).toBuffer(),
					sharp(originalBuffer).resize({ width: 240, withoutEnlargement: true }).webp({ quality: 45, effort: 4 }).toBuffer(),
				]);

				const uploadVariant = (body: Buffer, filename: string) =>
					fetch(`${CDN_WORKER_URL}/upload`, {
						method: 'POST',
						headers: {
							Authorization: `Bearer ${CDN_UPLOAD_SECRET}`,
							'X-Project-Id': params.id,
							'X-Filename': filename,
							'X-Skip-Register': 'true',
							'Content-Type': 'image/webp',
						},
						body: new Blob([toUint8(body)], { type: 'image/webp' }),
					});

				const [fullRes, clusterRes, thumbRes] = await Promise.all([
					uploadVariant(fullBuf, `${baseName}.webp`),
					uploadVariant(clusterBuf, `${baseName}_cluster.webp`),
					uploadVariant(thumbBuf, `${baseName}_thumb.webp`),
				]);

				if (!fullRes.ok || !clusterRes.ok || !thumbRes.ok) {
					console.error('[assets/upload] Error subiendo variantes WebP');
					return;
				}

				const { url: fullUrl, key: fullKey } = await fullRes.json() as { url: string; key: string };
				const { url: clusterUrl, key: clusterKey } = await clusterRes.json() as { url: string; key: string };
				const { url: thumbUrl, key: thumbKey } = await thumbRes.json() as { url: string; key: string };

				await fetch(
					`${PUBLIC_SUPABASE_URL}/rest/v1/assets?id=eq.${inserted.id}`,
					{
						method: 'PATCH',
						headers: {
							apikey: SUPABASE_SERVICE_ROLE_KEY,
							Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
							'Content-Type': 'application/json',
							Prefer: 'return=minimal',
						},
						body: JSON.stringify({
							key: fullKey,
							url: fullUrl,
							cluster_key: clusterKey,
							cluster_url: clusterUrl,
							thumb_key: thumbKey,
							thumb_url: thumbUrl,
						}),
					},
				);
			} catch (err) {
				console.error('[assets/upload] WebP background error:', err);
			}
		})());
	}

	return json({ ok: true, asset: inserted }, { status: 201 });
};
