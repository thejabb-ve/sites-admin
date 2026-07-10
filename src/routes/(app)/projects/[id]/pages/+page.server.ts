import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { isValidSlug } from '$lib/metadata';
import { logAudit } from '$lib/audit';

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

		const { data: project } = await locals.supabase
			.from('projects')
			.select('default_robots')
			.eq('id', params.id)
			.single();

		const { data: newPage, error: dbError } = await locals.supabase
			.from('pages')
			.insert({
				project_id: params.id,
				title,
				slug,
				full_path: '/' + slug,
				status:    'draft',
				robots:    project?.default_robots ?? 'index, follow',
			})
			.select('id, full_path')
			.single();

		if (dbError) {
			if (dbError.code === '23505') return fail(409, { error: 'Ya existe una página con ese slug.' });
			return fail(500, { error: 'Error al crear la página.' });
		}

		const { user } = await locals.safeGetSession();
		await logAudit({
			supabase: locals.supabase,
			projectId: params.id,
			userId: user?.id ?? null,
			actor: user?.email ?? 'desconocido',
			action: 'create',
			resourceType: 'page',
			resourceId: newPage.id,
			resourceName: `${title} (${newPage.full_path})`,
		});

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

		const { user } = await locals.safeGetSession();
		await logAudit({
			supabase: locals.supabase,
			projectId: params.id,
			userId: user?.id ?? null,
			actor: user?.email ?? 'desconocido',
			action: 'update',
			resourceType: 'page',
			resourceId: pageId,
			resourceName: `${title} (/${slug})`,
			changed: ['title', 'slug'],
		});
	},

	togglePublish: async ({ locals, params, request }) => {
		const form      = await request.formData();
		const pageId    = String(form.get('page_id')    ?? '');
		const newStatus = String(form.get('new_status') ?? '');
		const pageTitle = String(form.get('page_title') ?? '');

		if (!['draft', 'published'].includes(newStatus)) {
			return fail(400, { error: 'Estado inválido.' });
		}

		const { error: dbError } = await locals.supabase
			.from('pages')
			.update({ status: newStatus })
			.eq('id', pageId)
			.eq('project_id', params.id);

		if (dbError) return fail(500, { error: 'Error al cambiar estado.' });

		const { user } = await locals.safeGetSession();
		await logAudit({
			supabase: locals.supabase,
			projectId: params.id,
			userId: user?.id ?? null,
			actor: user?.email ?? 'desconocido',
			action: newStatus === 'published' ? 'publish' : 'update',
			resourceType: 'page',
			resourceId: pageId,
			resourceName: pageTitle || pageId,
			changed: ['status'],
		});

		return { success: newStatus === 'published' ? 'Página publicada.' : 'Página despublicada.' };
	},

	archive: async ({ locals, params, request }) => {
		const form      = await request.formData();
		const pageId    = String(form.get('page_id')    ?? '');
		const pageTitle = String(form.get('page_title') ?? '');

		const { error: dbError } = await locals.supabase
			.from('pages')
			.update({ archived_at: new Date().toISOString(), status: 'draft' })
			.eq('id', pageId)
			.eq('project_id', params.id);

		if (dbError) return fail(500, { error: 'Error al archivar.' });

		const { user } = await locals.safeGetSession();
		await logAudit({
			supabase: locals.supabase,
			projectId: params.id,
			userId: user?.id ?? null,
			actor: user?.email ?? 'desconocido',
			action: 'archive',
			resourceType: 'page',
			resourceId: pageId,
			resourceName: pageTitle || pageId,
		});

		return { success: 'Página archivada.' };
	},

	restore: async ({ locals, params, request }) => {
		const form      = await request.formData();
		const pageId    = String(form.get('page_id')    ?? '');
		const pageTitle = String(form.get('page_title') ?? '');

		const { error: dbError } = await locals.supabase
			.from('pages')
			.update({ archived_at: null, status: 'draft' })
			.eq('id', pageId)
			.eq('project_id', params.id);

		if (dbError) return fail(500, { error: 'Error al restaurar.' });

		const { user } = await locals.safeGetSession();
		await logAudit({
			supabase: locals.supabase,
			projectId: params.id,
			userId: user?.id ?? null,
			actor: user?.email ?? 'desconocido',
			action: 'restore',
			resourceType: 'page',
			resourceId: pageId,
			resourceName: pageTitle || pageId,
		});

		return { success: 'Página restaurada.' };
	},

	deletePage: async ({ locals, params, request }) => {
		const form      = await request.formData();
		const pageId    = String(form.get('page_id')    ?? '');
		const pageTitle = String(form.get('page_title') ?? '');

		const { data: page } = await locals.supabase
			.from('pages')
			.select('archived_at, title, full_path')
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

		const { user } = await locals.safeGetSession();
		await logAudit({
			supabase: locals.supabase,
			projectId: params.id,
			userId: user?.id ?? null,
			actor: user?.email ?? 'desconocido',
			action: 'delete',
			resourceType: 'page',
			resourceId: pageId,
			resourceName: pageTitle || page.title || page.full_path || pageId,
		});

		return { success: 'Página eliminada permanentemente.' };
	},
};
