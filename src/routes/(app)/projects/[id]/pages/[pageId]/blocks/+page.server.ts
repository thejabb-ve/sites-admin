import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { ADMIN_BLOCK_REGISTRY } from '$lib/blocks/adminRegistry';
import { logAudit } from '$lib/audit';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { data: project } = await locals.supabase
		.from('projects')
		.select('id, name')
		.eq('id', params.id)
		.single();

	if (!project) error(404, 'Proyecto no encontrado.');

	const { data: page } = await locals.supabase
		.from('pages')
		.select('id, title, slug, full_path, status')
		.eq('id', params.pageId)
		.eq('project_id', params.id)
		.single();

	if (!page) error(404, 'Página no encontrada.');

	const { data: blocks } = await locals.supabase
		.from('blocks')
		.select('id, type, order, props, version, parent_block_id')
		.eq('page_id', params.pageId)
		.order('order', { ascending: true });

	return { project, page, blocks: blocks ?? [] };
};

export const actions: Actions = {
	addBlock: async ({ locals, params, request }) => {
		const form = await request.formData();
		const type = String(form.get('type') ?? '').trim();

		if (!type || !ADMIN_BLOCK_REGISTRY[type]) {
			return fail(400, { error: 'Tipo de bloque inválido.' });
		}

		const { data: maxRow } = await locals.supabase
			.from('blocks')
			.select('order')
			.eq('page_id', params.pageId)
			.order('order', { ascending: false })
			.limit(1)
			.maybeSingle();

		const newOrder = (maxRow?.order ?? -1) + 1;

		const { data: newBlock, error: dbError } = await locals.supabase
			.from('blocks')
			.insert({
				page_id: params.pageId,
				type,
				order:   newOrder,
				props:   ADMIN_BLOCK_REGISTRY[type]!.defaultProps as never,
				version: 1,
			})
			.select('id')
			.single();

		if (dbError) return fail(500, { error: 'Error al crear el bloque.' });

		const { user } = await locals.safeGetSession();
		await logAudit({
			supabase: locals.supabase,
			projectId: params.id,
			userId: user?.id ?? null,
			actor: user?.email ?? 'desconocido',
			action: 'create',
			resourceType: 'block',
			resourceId: newBlock?.id,
			resourceName: type,
		});

		return { success: true };
	},

	updateProps: async ({ locals, params, request }) => {
		const form      = await request.formData();
		const blockId   = String(form.get('block_id')   ?? '').trim();
		const blockType = String(form.get('block_type') ?? '').trim();
		const propsRaw  = String(form.get('props')      ?? '').trim();

		if (!blockId || !blockType) return fail(400, { error: 'Faltan parámetros.' });

		const entry = ADMIN_BLOCK_REGISTRY[blockType];
		if (!entry) return fail(400, { error: 'Tipo de bloque inválido.' });

		let parsed: unknown;
		try { parsed = JSON.parse(propsRaw); } catch {
			return fail(400, { error: 'JSON de props inválido.' });
		}

		const result = entry.schema.safeParse(parsed);
		if (!result.success) {
			const msgs = result.error.issues.map(i => i.message).join(', ');
			return fail(400, { error: `Props inválidas: ${msgs}` });
		}

		const { data: existing } = await locals.supabase
			.from('blocks')
			.select('id, props')
			.eq('id', blockId)
			.eq('page_id', params.pageId)
			.single();

		if (!existing) return fail(404, { error: 'Bloque no encontrado.' });

		await locals.supabase.from('blocks_history').insert({
			block_id: blockId,
			props:    existing.props,
		});

		const { error: dbError } = await locals.supabase
			.from('blocks')
			.update({ props: result.data as never })
			.eq('id', blockId)
			.eq('page_id', params.pageId);

		if (dbError) return fail(500, { error: 'Error al guardar el bloque.' });

		const { user } = await locals.safeGetSession();
		await logAudit({
			supabase: locals.supabase,
			projectId: params.id,
			userId: user?.id ?? null,
			actor: user?.email ?? 'desconocido',
			action: 'update',
			resourceType: 'block',
			resourceId: blockId,
			resourceName: blockType,
			changed: ['props'],
		});

		return { success: true };
	},

	deleteBlock: async ({ locals, params, request }) => {
		const form    = await request.formData();
		const blockId = String(form.get('block_id') ?? '').trim();

		if (!blockId) return fail(400, { error: 'Falta el ID del bloque.' });

		const { data: block } = await locals.supabase
			.from('blocks')
			.select('id, type')
			.eq('id', blockId)
			.eq('page_id', params.pageId)
			.single();

		const { error: dbError } = await locals.supabase
			.from('blocks')
			.delete()
			.eq('id', blockId)
			.eq('page_id', params.pageId);

		if (dbError) return fail(500, { error: 'Error al eliminar el bloque.' });

		const { user } = await locals.safeGetSession();
		await logAudit({
			supabase: locals.supabase,
			projectId: params.id,
			userId: user?.id ?? null,
			actor: user?.email ?? 'desconocido',
			action: 'delete',
			resourceType: 'block',
			resourceId: blockId,
			resourceName: block?.type ?? blockId,
		});

		return { success: true };
	},

	reorderBlocks: async ({ locals, params, request }) => {
		const form   = await request.formData();
		const idsRaw = String(form.get('ordered_ids') ?? '').trim();

		let orderedIds: string[];
		try { orderedIds = JSON.parse(idsRaw); } catch {
			return fail(400, { error: 'Formato de IDs inválido.' });
		}

		if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
			return fail(400, { error: 'Lista de IDs vacía.' });
		}

		const { data: existing } = await locals.supabase
			.from('blocks')
			.select('id')
			.eq('page_id', params.pageId)
			.in('id', orderedIds);

		if (!existing || existing.length !== orderedIds.length) {
			return fail(400, { error: 'Algunos bloques no pertenecen a esta página.' });
		}

		const results = await Promise.all(
			orderedIds.map((id, i) =>
				locals.supabase
					.from('blocks')
					.update({ order: i })
					.eq('id', id)
					.eq('page_id', params.pageId),
			),
		);

		if (results.some(r => r.error)) {
			return fail(500, { error: 'Error al reordenar los bloques.' });
		}

		const { user } = await locals.safeGetSession();
		await logAudit({
			supabase: locals.supabase,
			projectId: params.id,
			userId: user?.id ?? null,
			actor: user?.email ?? 'desconocido',
			action: 'update',
			resourceType: 'block',
			resourceName: `${orderedIds.length} bloques`,
			changed: ['order'],
		});

		return { success: true };
	},
};
