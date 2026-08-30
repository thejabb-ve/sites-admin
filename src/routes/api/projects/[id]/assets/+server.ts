import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'No autenticado' }, { status: 401 });

	const { data: assets } = await locals.supabase
		.from('assets')
		.select('id, url, thumb_url, filename, mime_type, created_at')
		.eq('project_id', params.id)
		.order('created_at', { ascending: false });

	return json(assets ?? []);
};
