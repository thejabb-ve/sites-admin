import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { isValidSlug } from '$lib/metadata';

export const load: PageServerLoad = async ({ locals, params, url }) => {
	const { data: project } = await locals.supabase
		.from('projects')
		.select('id, name, default_robots')
		.eq('id', params.id)
		.single();

	if (!project) error(404, 'Proyecto no encontrado.');

	const tab = url.searchParams.get('tab') === 'archived' ? 'archived' : 'active';

	const query = locals.supabase
		.from('pages')
		.select('id, title, slug, full_path, status, robots, created_at, updated_at, archived_at')
		.eq('project_id', params.id)
		.order('full_path');

	const { data: pages } = tab === 'archived'
		? await query.not('archived_at', 'is', null)
		: await query.is('archived_at', null);

	return { project, pages: pages ?? [], tab };
};

export const actions: Actions = {
	create: async ({ locals, params, request }) => {
		const form  = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const slug  = String(form.get('slug')  ?? '').trim();

		if (!title) return fail(400, { error: 'El título es obligatorio.' });
		if (!slug || !isValidSlug(slug)) {
			return fail(400, { error: 'El slug solo puede contener letras minúsculas, números y guiones.' });
		}

		// Leer default_robots del proyecto para usarlo en la página nueva
		const { data: project } = await locals.supabase
			.from('projects')
			.select('default_robots')
			.eq('id', params.id)
			.single();

		const { error: dbError } = await locals.supabase.from('pages').insert({
			project_id: params.id,
			title,
			slug,
			full_path: '/' + slug,
			status:    'draft',
			robots:    project?.default_robots ?? 'index, follow',
		});

		if (dbError) {
			if (dbError.code === '23505') return fail(409, { error: 'Ya existe una página con ese slug.' });
			return fail(500, { error: 'Error al crear la página.' });
		}

		return { success: 'Página creada correctamente.' };
	},

	rename: async ({ locals, params, request }) => {
		const form   = await request.formData();
		const pageId = String(form.get('page_id') ?? '');
		const title  = String(form.get('title')   ?? '').trim();
		const slug   = String(form.get('slug')     ?? '').trim();

		if (!title || !slug || !isValidSlug(slug)) {
			return fail(400, { error: 'Título o slug inválidos.' });
		}

		const { error: dbError } = await locals.supabase
			.from('pages')
			.update({ title, slug, full_path: '/' + slug })
			.eq('id', pageId)
			.eq('project_id', params.id);

		if (dbError) {
			if (dbError.code === '23505') return fail(409, { error: 'Ya existe una página con ese slug.' });
			return fail(500, { error: 'Error al renombrar.' });
		}
	},

	togglePublish: async ({ locals, params, request }) => {
		const form      = await request.formData();
		const pageId    = String(form.get('page_id')    ?? '');
		const newStatus = String(form.get('new_status') ?? '');

		if (!['draft', 'published'].includes(newStatus)) {
			return fail(400, { error: 'Estado inválido.' });
		}

		const { error: dbError } = await locals.supabase
			.from('pages')
			.update({ status: newStatus })
			.eq('id', pageId)
			.eq('project_id', params.id);

		if (dbError) return fail(500, { error: 'Error al cambiar estado.' });

		return { success: newStatus === 'published' ? 'Página publicada.' : 'Página despublicada.' };
	},

	archive: async ({ locals, params, request }) => {
		const form   = await request.formData();
		const pageId = String(form.get('page_id') ?? '');

		const { error: dbError } = await locals.supabase
			.from('pages')
			.update({ archived_at: new Date().toISOString(), status: 'draft' })
			.eq('id', pageId)
			.eq('project_id', params.id);

		if (dbError) return fail(500, { error: 'Error al archivar.' });

		return { success: 'Página archivada.' };
	},

	restore: async ({ locals, params, request }) => {
		const form   = await request.formData();
		const pageId = String(form.get('page_id') ?? '');

		const { error: dbError } = await locals.supabase
			.from('pages')
			.update({ archived_at: null, status: 'draft' })
			.eq('id', pageId)
			.eq('project_id', params.id);

		if (dbError) return fail(500, { error: 'Error al restaurar.' });

		return { success: 'Página restaurada.' };
	},

	deletePage: async ({ locals, params, request }) => {
		const form   = await request.formData();
		const pageId = String(form.get('page_id') ?? '');

		// Solo se pueden eliminar páginas ya archivadas para evitar borrados accidentales.
		const { data: page } = await locals.supabase
			.from('pages')
			.select('archived_at')
			.eq('id', pageId)
			.eq('project_id', params.id)
			.single();

		if (!page?.archived_at) {
			return fail(400, { error: 'Solo se pueden eliminar páginas archivadas.' });
		}

		const { error: dbError } = await locals.supabase
			.from('pages')
			.delete()
			.eq('id', pageId)
			.eq('project_id', params.id);

		if (dbError) return fail(500, { error: 'Error al eliminar la página.' });

		return { success: 'Página eliminada permanentemente.' };
	},
};
