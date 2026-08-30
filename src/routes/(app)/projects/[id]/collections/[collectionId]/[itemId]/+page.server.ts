import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { isValidSlug, isValidFullPath } from '$lib/metadata';
import { logProjectAudit } from '$lib/audit';
import { requireProject } from '$lib/server/project';

export const load: PageServerLoad = async ({ locals, params }) => {
	const [project, { data: collection }, { data: item }] = await Promise.all([
		requireProject(locals.supabase, params.id, 'id, name'),
		locals.supabase
			.from('collections')
			.select('id, name, slug, schema')
			.eq('id', params.collectionId)
			.eq('project_id', params.id)
			.single(),
		locals.supabase
			.from('collection_items')
			.select('*')
			.eq('id', params.itemId)
			.eq('project_id', params.id)
			.single(),
	]);
	if (!collection) error(404, 'Colección no encontrada.');
	if (!item) error(404, 'Ítem no encontrado.');

	return { project, collection, item };
};

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		const form     = await request.formData();
		const title    = String(form.get('title')     ?? '').trim();
		const slug     = String(form.get('slug')      ?? '').trim();
		const fullPath = String(form.get('full_path') ?? '').trim();
		const order    = parseInt(String(form.get('order') ?? '1'), 10);
		const status   = String(form.get('status')    ?? '');

		if (!title) return fail(400, { error: 'El título es obligatorio.' });
		if (!slug || !isValidSlug(slug)) {
			return fail(400, { error: 'El slug solo puede contener letras minúsculas, números y guiones.' });
		}
		if (!['draft', 'published'].includes(status)) {
			return fail(400, { error: 'Estado inválido.' });
		}
		if (!isValidFullPath(fullPath)) {
			return fail(400, { error: 'La URL completa debe ser una ruta válida (ej. /modelo/es/comite).' });
		}

		const { data: collection } = await locals.supabase
			.from('collections')
			.select('schema')
			.eq('id', params.collectionId)
			.eq('project_id', params.id)
			.single();

		const { data: currentItem } = await locals.supabase
			.from('collection_items')
			.select('fields')
			.eq('id', params.itemId)
			.eq('project_id', params.id)
			.single();

		const schema = collection?.schema as {
			base_path?: string;
			fields: Array<{ key: string; type: string; label: string; options?: string[] }>;
		} | null;

		const currentFields = (currentItem?.fields ?? {}) as Record<string, unknown>;
		const fields: Record<string, unknown> = {};

		for (const field of schema?.fields ?? []) {
			const currentValue = currentFields[field.key];
			if (Array.isArray(currentValue)) {
				fields[field.key] = String(form.get(field.key) ?? '')
					.split('\n')
					.map((s) => s.trim())
					.filter(Boolean);
			} else {
				fields[field.key] = form.get(field.key) ?? '';
			}
		}

		const { error: dbError } = await locals.supabase
			.from('collection_items')
			.update({ title, slug, full_path: fullPath, order, status, fields: fields as never })
			.eq('id', params.itemId)
			.eq('project_id', params.id);

		if (dbError) {
			if (dbError.code === '23505') return fail(409, { error: 'Ya existe un ítem con esa ruta.' });
			return fail(500, { error: 'Error al guardar los cambios.' });
		}

		await logProjectAudit(locals, params.id, {
			action:       'update',
			resourceType: 'collection_item',
			resourceId:   params.itemId,
			resourceName: title,
			changed:      ['title', 'slug', 'full_path', 'fields', 'status'],
		});

		return { success: 'Cambios guardados correctamente.' };
	},
};
