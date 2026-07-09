import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { data: project } = await locals.supabase
		.from('projects')
		.select('id, name')
		.eq('id', params.id)
		.single();

	if (!project) error(404, 'Proyecto no encontrado.');

	const { data: assets } = await locals.supabase
		.from('assets')
		.select('id, key, url, thumb_url, filename, mime_type, size_bytes, created_at')
		.eq('project_id', params.id)
		.order('created_at', { ascending: false });

	return { project, assets: assets ?? [] };
};
