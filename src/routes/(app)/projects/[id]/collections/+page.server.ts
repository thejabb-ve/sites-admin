import { requireProject } from '$lib/server/project';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const [project, { data: collections }] = await Promise.all([
		requireProject(locals.supabase, params.id, 'id, name'),
		locals.supabase
			.from('collections')
			.select('id, name, slug, collection_items(count)')
			.eq('project_id', params.id)
			.order('name'),
	]);

	return { project, collections: collections ?? [] };
};
