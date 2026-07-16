import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { data: project } = await locals.supabase
		.from('projects')
		.select('id, name')
		.eq('id', params.id)
		.single();
	if (!project) error(404, 'Proyecto no encontrado.');

	const { data: collections } = await locals.supabase
		.from('collections')
		.select('id, name, slug, schema, collection_items(count)')
		.eq('project_id', params.id)
		.order('name');

	return { project, collections: collections ?? [] };
};
