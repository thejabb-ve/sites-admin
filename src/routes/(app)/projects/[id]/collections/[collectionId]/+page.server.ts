import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { isValidSlug, slugify } from '$lib/metadata';
import { logProjectAudit } from '$lib/audit';
import { requireProject } from '$lib/server/project';

export const load: PageServerLoad = async ({ locals, params }) => {
	const [project, { data: collection }, { data: items }] = await Promise.all([
		requireProject(locals.supabase, params.id, 'id, name'),
		locals.supabase
			.from('collections')
			.select('id, name, slug, schema')
			.eq('id', params.collectionId)
			.eq('project_id', params.id)
			.single(),
		locals.supabase
			.from('collection_items')
			.select('id, title, slug, full_path, status, order, created_at')
			.eq('collection_id', params.collectionId)
			.order('order', { ascending: true }),
	]);
	if (!collection) error(404, 'Colección no encontrada.');

	return { project, collection, items: items ?? [] };
};

export const actions: Actions = {
	create: async ({ locals, params, request }) => {
		const form  = await request.formData();
		const title = String(form.get('title') ?? '').trim();
		const slug  = String(form.get('slug')  ?? '').trim() || slugify(title);

		if (!title) return fail(400, { error: 'El título es obligatorio.' });
		if (!slug || !isValidSlug(slug)) {
			return fail(400, { error: 'El slug solo puede contener letras minúsculas, números y guiones.' });
		}

		const { data: collection } = await locals.supabase
			.from('collections')
			.select('schema')
			.eq('id', params.collectionId)
			.eq('project_id', params.id)
			.single();

		const schema = collection?.schema as { base_path?: string; fields: unknown[] } | null;
		const basePath = schema?.base_path ?? '';
		const fullPath = basePath + '/' + slug;

		const { data: maxRow } = await locals.supabase
			.from('collection_items')
			.select('order')
			.eq('collection_id', params.collectionId)
			.order('order', { ascending: false })
			.limit(1)
			.single();
		const nextOrder = (maxRow?.order ?? 0) + 1;

		const { data: newItem, error: dbError } = await locals.supabase
			.from('collection_items')
			.insert({
				collection_id: params.collectionId,
				project_id:    params.id,
				title,
				slug,
				full_path:     fullPath,
				fields:        {},
				status:        'draft',
				order:         nextOrder,
			})
			.select('id')
			.single();

		if (dbError) {
			if (dbError.code === '23505') return fail(409, { error: 'Ya existe un ítem con esa ruta.' });
			return fail(500, { error: 'Error al crear el ítem.' });
		}

		await logProjectAudit(locals, params.id, {
			action:       'create',
			resourceType: 'collection_item',
			resourceId:   newItem.id,
			resourceName: title,
		});

		return { success: 'Ítem creado correctamente.' };
	},

	toggleStatus: async ({ locals, params, request }) => {
		const form      = await request.formData();
		const itemId    = String(form.get('item_id')    ?? '');
		const itemTitle = String(form.get('item_title') ?? '');
		const newStatus = String(form.get('new_status') ?? '');

		if (!['draft', 'published'].includes(newStatus)) {
			return fail(400, { error: 'Estado inválido.' });
		}

		const { error: dbError } = await locals.supabase
			.from('collection_items')
			.update({ status: newStatus })
			.eq('id', itemId)
			.eq('collection_id', params.collectionId)
			.eq('project_id', params.id);

		if (dbError) return fail(500, { error: 'Error al cambiar estado.' });

		await logProjectAudit(locals, params.id, {
			action:       newStatus === 'published' ? 'publish' : 'update',
			resourceType: 'collection_item',
			resourceId:   itemId,
			resourceName: itemTitle || itemId,
			changed:      ['status'],
		});

		return { success: newStatus === 'published' ? 'Ítem publicado.' : 'Ítem despublicado.' };
	},

	deleteItem: async ({ locals, params, request }) => {
		const form      = await request.formData();
		const itemId    = String(form.get('item_id')    ?? '');
		const itemTitle = String(form.get('item_title') ?? '');

		const { error: dbError } = await locals.supabase
			.from('collection_items')
			.delete()
			.eq('id', itemId)
			.eq('collection_id', params.collectionId)
			.eq('project_id', params.id);

		if (dbError) return fail(500, { error: 'Error al eliminar el ítem.' });

		await logProjectAudit(locals, params.id, {
			action:       'delete',
			resourceType: 'collection_item',
			resourceId:   itemId,
			resourceName: itemTitle || itemId,
		});

		return { success: 'Ítem eliminado.' };
	},
};
