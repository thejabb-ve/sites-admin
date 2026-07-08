import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { isValidRobots } from '$lib/metadata';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { data: project } = await locals.supabase
		.from('projects')
		.select('id, name')
		.eq('id', params.id)
		.single();

	if (!project) error(404, 'Proyecto no encontrado.');

	const { data: page } = await locals.supabase
		.from('pages')
		.select('id, title, slug, full_path, status, seo_title, seo_description, robots, og_title, og_description, og_image_url, canonical_url')
		.eq('id', params.pageId)
		.eq('project_id', params.id)
		.single();

	if (!page) error(404, 'Página no encontrada.');

	return { project, page };
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		const form = await request.formData();

		const seoTitle       = String(form.get('seo_title') ?? '').trim() || null;
		const seoDescription = String(form.get('seo_description') ?? '').trim() || null;
		const robots         = String(form.get('robots') ?? 'index, follow');
		const ogTitle        = String(form.get('og_title') ?? '').trim() || null;
		const ogDescription  = String(form.get('og_description') ?? '').trim() || null;
		const ogImageUrl     = String(form.get('og_image_url') ?? '').trim() || null;
		const canonicalUrl   = String(form.get('canonical_url') ?? '').trim() || null;

		if (!isValidRobots(robots)) return fail(400, { error: 'Valor de robots inválido.' });

		const { error: dbError } = await locals.supabase
			.from('pages')
			.update({
				seo_title:       seoTitle,
				seo_description: seoDescription,
				robots,
				og_title:        ogTitle,
				og_description:  ogDescription,
				og_image_url:    ogImageUrl,
				canonical_url:   canonicalUrl,
			})
			.eq('id', params.pageId)
			.eq('project_id', params.id);

		if (dbError) return fail(500, { error: 'Error al guardar los metadatos.' });

		return { success: true };
	},
};
