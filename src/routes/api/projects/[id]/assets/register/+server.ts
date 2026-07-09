import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'No autenticado' }, 401);

	let body: { key?: string; url?: string; filename?: string; size_bytes?: number; mime_type?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Body inválido' }, 400);
	}

	const { key, url, filename, size_bytes, mime_type } = body;
	if (!key || !url || !filename) return json({ error: 'key, url y filename son requeridos' }, 400);

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
		return json({ error: 'Error registrando asset' }, 500);
	}

	return json({ ok: true, asset }, 201);
};

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
