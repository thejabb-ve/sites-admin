import { json } from '@sveltejs/kit';
import { CDN_WORKER_URL } from '$env/static/private';
import type { RequestHandler } from './$types';

const CDN_ORIGIN = new URL(CDN_WORKER_URL).origin;

export const POST: RequestHandler = async ({ request, params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'No autenticado' }, { status: 401 });

	const { data: project } = await locals.supabase
		.from('projects')
		.select('id')
		.eq('id', params.id)
		.single();
	if (!project) return json({ error: 'Proyecto no encontrado' }, { status: 404 });

	let body: { key?: string; url?: string; filename?: string; size_bytes?: number; mime_type?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Body inválido' }, { status: 400 });
	}

	const { key, url, filename, size_bytes, mime_type } = body;
	if (!key || !url || !filename) return json({ error: 'key, url y filename son requeridos' }, { status: 400 });

	let urlOrigin: string;
	try { urlOrigin = new URL(url).origin; } catch { return json({ error: 'url inválida' }, { status: 400 }); }
	if (urlOrigin !== CDN_ORIGIN) return json({ error: 'url debe pertenecer al CDN propio' }, { status: 400 });

	const { data: asset, error: dbErr } = await locals.supabase
		.from('assets')
		.insert({
			project_id: params.id,
			key,
			url,
			original_key: key,
			original_url: url,
			filename,
			mime_type: mime_type ?? 'video/mp4',
			size_bytes: size_bytes ?? 0,
			is_public: true,
		})
		.select('id, key, url, filename, mime_type, size_bytes, thumb_url, created_at')
		.single();

	if (dbErr || !asset) {
		console.error('[assets/register] Supabase insert error:', dbErr?.message);
		return json({ error: 'Error registrando asset' }, { status: 500 });
	}

	return json({ ok: true, asset }, { status: 201 });
};
