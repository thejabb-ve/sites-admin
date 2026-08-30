import { requireProject } from '$lib/server/project';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const project = await requireProject(locals.supabase, params.id, 'id, name');

	const { data: assets } = await locals.supabase
		.from('assets')
		.select('id, key, url, thumb_url, filename, mime_type, size_bytes, created_at')
		.eq('project_id', params.id)
		.order('created_at', { ascending: false });

	return { project, assets: assets ?? [] };
};
