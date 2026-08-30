import { describe, it, expect, mock, beforeEach } from 'bun:test';
import * as sveltekit from '@sveltejs/kit';

// ─── Mocks de SvelteKit ────────────────────────────────────────────────────
// Se preserva el resto del módulo real (json, redirect, ...) para no romper
// otros test files que importan @sveltejs/kit en la misma corrida de `bun test src`.

mock.module('@sveltejs/kit', () => ({
	...sveltekit,
	error: (status: number, msg: string) => { throw Object.assign(new Error(msg), { status }); },
	fail:  (status: number, data: unknown) => ({ type: 'failure' as const, status, data }),
}));

// ─── Mock de $lib/audit ────────────────────────────────────────────────────

const mockLogProjectAudit = mock(() => Promise.resolve());
mock.module('$lib/audit', () => ({
	logProjectAudit: (...args: unknown[]) => (mockLogProjectAudit as unknown as (...a: unknown[]) => unknown)(...args),
}));

// ─── Fixtures ────────────────────────────────────────────────────────────

const PROJECT = { id: 'proj-1', name: 'Test' };
const PAGE    = { id: 'page-1', title: 'Home', slug: 'home', full_path: '/home', status: 'draft' };

// ─── Mocks de Supabase (una función por operación distinta sobre `blocks`) ──

const mockProjectSingle     = mock(() => Promise.resolve({ data: PROJECT, error: null }));
const mockPageSingle        = mock(() => Promise.resolve({ data: PAGE, error: null }));
const mockBlocksListOrder   = mock(() => Promise.resolve({ data: [], error: null }));
const mockMaxOrderMaybe     = mock(() => Promise.resolve({ data: null, error: null }));
const mockInsertBlockSingle = mock(() => Promise.resolve({ data: { id: 'block-new' }, error: null }));
const mockExistingProps     = mock(() => Promise.resolve({ data: { id: 'block-1', props: { content: 'viejo' } }, error: null }));
const mockHistoryInsert     = mock(() => Promise.resolve({ error: null }));
const mockUpdatePropsResult = mock(() => Promise.resolve({ error: null }));
const mockBlockTypeSingle   = mock(() => Promise.resolve({ data: { id: 'block-1', type: 'richText' }, error: null }));
const mockDeleteResult      = mock(() => Promise.resolve({ error: null }));
const mockInExisting        = mock(() => Promise.resolve({ data: [{ id: 'b-1' }, { id: 'b-2' }], error: null }));
const mockReorderUpdate     = mock(() => Promise.resolve({ error: null }));

function makeSupabase() {
	return {
		from: (table: string) => {
			if (table === 'projects') {
				return { select: () => ({ eq: () => ({ single: mockProjectSingle }) }) };
			}
			if (table === 'pages') {
				return { select: () => ({ eq: () => ({ eq: () => ({ single: mockPageSingle }) }) }) };
			}
			if (table === 'blocks_history') {
				return { insert: () => mockHistoryInsert() };
			}
			// table === 'blocks'
			return {
				select: (cols: string) => {
					if (cols.includes('parent_block_id')) {
						// load(): .eq('page_id', ...).order('order', {ascending:true})
						return { eq: () => ({ order: () => mockBlocksListOrder() }) };
					}
					if (cols === 'order') {
						// addBlock(): .eq().order().limit().maybeSingle()
						return { eq: () => ({ order: () => ({ limit: () => ({ maybeSingle: mockMaxOrderMaybe }) }) }) };
					}
					if (cols.includes('props')) {
						// updateProps(): .eq('id',...).eq('page_id',...).single()
						return { eq: () => ({ eq: () => ({ single: mockExistingProps }) }) };
					}
					if (cols.includes('type')) {
						// deleteBlock(): .eq('id',...).eq('page_id',...).single()
						return { eq: () => ({ eq: () => ({ single: mockBlockTypeSingle }) }) };
					}
					// reorderBlocks(): .eq('page_id',...).in('id', orderedIds)
					return { eq: () => ({ in: () => mockInExisting() }) };
				},
				insert: (_data: unknown) => ({ select: () => ({ single: mockInsertBlockSingle }) }),
				update: (data: Record<string, unknown>) => ({
					eq: () => ({
						eq: () => ('props' in data ? mockUpdatePropsResult() : mockReorderUpdate()),
					}),
				}),
				delete: () => ({ eq: () => ({ eq: () => mockDeleteResult() }) }),
			};
		},
	};
}

// ─── Import dinámico después de los mocks ────────────────────────────────

const { actions, load } = await import('./+page.server');

// ─── Helpers ────────────────────────────────────────────────────────────

function makeFormData(fields: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.append(k, v);
	return fd;
}

function makeLocals() {
	return {
		supabase: makeSupabase(),
		safeGetSession: () => Promise.resolve({ user: { id: 'user-1', email: 'test@test.com' }, session: null }),
	};
}

beforeEach(() => {
	mockLogProjectAudit.mockReset();
	mockLogProjectAudit.mockResolvedValue(undefined);
	mockProjectSingle.mockReset();
	mockProjectSingle.mockResolvedValue({ data: PROJECT, error: null } as never);
	mockPageSingle.mockReset();
	mockPageSingle.mockResolvedValue({ data: PAGE, error: null } as never);
	mockBlocksListOrder.mockReset();
	mockBlocksListOrder.mockResolvedValue({ data: [], error: null } as never);
	mockMaxOrderMaybe.mockReset();
	mockMaxOrderMaybe.mockResolvedValue({ data: null, error: null } as never);
	mockInsertBlockSingle.mockReset();
	mockInsertBlockSingle.mockResolvedValue({ data: { id: 'block-new' }, error: null } as never);
	mockExistingProps.mockReset();
	mockExistingProps.mockResolvedValue({ data: { id: 'block-1', props: { content: 'viejo' } }, error: null } as never);
	mockHistoryInsert.mockReset();
	mockHistoryInsert.mockResolvedValue({ error: null } as never);
	mockUpdatePropsResult.mockReset();
	mockUpdatePropsResult.mockResolvedValue({ error: null } as never);
	mockBlockTypeSingle.mockReset();
	mockBlockTypeSingle.mockResolvedValue({ data: { id: 'block-1', type: 'richText' }, error: null } as never);
	mockDeleteResult.mockReset();
	mockDeleteResult.mockResolvedValue({ error: null } as never);
	mockInExisting.mockReset();
	mockInExisting.mockResolvedValue({ data: [{ id: 'b-1' }, { id: 'b-2' }], error: null } as never);
	mockReorderUpdate.mockReset();
	mockReorderUpdate.mockResolvedValue({ error: null } as never);
});

// ─── load ──────────────────────────────────────────────────────────────────

describe('load — bloques de página', () => {
	it('devuelve proyecto, página y bloques', async () => {
		const BLOCKS = [{ id: 'b-1', type: 'richText', order: 0, props: {}, version: 1, parent_block_id: null }];
		mockBlocksListOrder.mockResolvedValueOnce({ data: BLOCKS, error: null } as never);
		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1', pageId: 'page-1' },
		} as never) as Record<string, unknown>;

		expect(result['project']).toEqual(PROJECT);
		expect(result['page']).toEqual(PAGE);
		expect(result['blocks']).toEqual(BLOCKS);
	});

	it('devuelve array vacío cuando no hay bloques', async () => {
		mockBlocksListOrder.mockResolvedValueOnce({ data: null, error: null } as never);
		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1', pageId: 'page-1' },
		} as never) as Record<string, unknown>;

		expect(result['blocks']).toEqual([]);
	});

	it('lanza 404 cuando la página no existe', async () => {
		mockPageSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await expect(
			load({ locals: makeLocals() as never, params: { id: 'proj-1', pageId: 'xxx' } } as never),
		).rejects.toMatchObject({ status: 404 });
	});

	it('lanza 404 cuando el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await expect(
			load({ locals: makeLocals() as never, params: { id: 'xxx', pageId: 'page-1' } } as never),
		).rejects.toMatchObject({ status: 404 });
	});
});

// ─── actions.addBlock ────────────────────────────────────────────────────────

describe('actions.addBlock', () => {
	it('devuelve 400 cuando el tipo está vacío', async () => {
		const form = makeFormData({ type: '' });
		const result = await actions.addBlock({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando el tipo no existe en el registry', async () => {
		const form = makeFormData({ type: 'no-existe' });
		const result = await actions.addBlock({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 500 cuando Supabase falla al insertar', async () => {
		mockInsertBlockSingle.mockResolvedValueOnce({ data: null, error: { message: 'db error' } } as never);
		const form = makeFormData({ type: 'richText' });
		const result = await actions.addBlock({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('crea el bloque con order 0 cuando no hay bloques previos y registra auditoría', async () => {
		const form = makeFormData({ type: 'richText' });
		const result = await actions.addBlock({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toEqual({ success: true });
		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});

	it('calcula el nuevo order a partir del máximo existente', async () => {
		mockMaxOrderMaybe.mockResolvedValueOnce({ data: { order: 4 }, error: null } as never);
		const form = makeFormData({ type: 'richText' });
		const result = await actions.addBlock({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toEqual({ success: true });
	});
});

// ─── actions.updateProps ─────────────────────────────────────────────────────

describe('actions.updateProps', () => {
	it('devuelve 400 cuando faltan block_id o block_type', async () => {
		const form = makeFormData({ block_id: '', block_type: 'richText', props: '{}' });
		const result = await actions.updateProps({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando el tipo de bloque no existe en el registry', async () => {
		const form = makeFormData({ block_id: 'block-1', block_type: 'no-existe', props: '{}' });
		const result = await actions.updateProps({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando el JSON de props es inválido', async () => {
		const form = makeFormData({ block_id: 'block-1', block_type: 'richText', props: '{invalid' });
		const result = await actions.updateProps({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando las props no cumplen el schema Zod', async () => {
		const form = makeFormData({ block_id: 'block-1', block_type: 'richText', props: JSON.stringify({}) });
		const result = await actions.updateProps({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 404 cuando el bloque no existe', async () => {
		mockExistingProps.mockResolvedValueOnce({ data: null, error: null } as never);
		const form = makeFormData({ block_id: 'block-x', block_type: 'richText', props: JSON.stringify({ content: 'nuevo' }) });
		const result = await actions.updateProps({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 404 });
	});

	it('devuelve 500 cuando Supabase falla al actualizar', async () => {
		mockUpdatePropsResult.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({ block_id: 'block-1', block_type: 'richText', props: JSON.stringify({ content: 'nuevo' }) });
		const result = await actions.updateProps({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('actualiza las props correctamente, guarda historial y registra auditoría', async () => {
		const form = makeFormData({ block_id: 'block-1', block_type: 'richText', props: JSON.stringify({ content: 'nuevo contenido' }) });
		const result = await actions.updateProps({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toEqual({ success: true });
		expect(mockHistoryInsert).toHaveBeenCalledTimes(1);
		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});
});

// ─── actions.deleteBlock ──────────────────────────────────────────────────────

describe('actions.deleteBlock', () => {
	it('devuelve 400 cuando falta el ID del bloque', async () => {
		const form = makeFormData({ block_id: '' });
		const result = await actions.deleteBlock({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 500 cuando Supabase falla al eliminar', async () => {
		mockDeleteResult.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({ block_id: 'block-1' });
		const result = await actions.deleteBlock({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('elimina el bloque correctamente y registra auditoría', async () => {
		const form = makeFormData({ block_id: 'block-1' });
		const result = await actions.deleteBlock({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toEqual({ success: true });
		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});
});

// ─── actions.reorderBlocks ────────────────────────────────────────────────────

describe('actions.reorderBlocks', () => {
	it('devuelve 400 cuando el JSON de IDs es inválido', async () => {
		const form = makeFormData({ ordered_ids: '{invalid' });
		const result = await actions.reorderBlocks({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando la lista de IDs está vacía', async () => {
		const form = makeFormData({ ordered_ids: JSON.stringify([]) });
		const result = await actions.reorderBlocks({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando algunos bloques no pertenecen a la página', async () => {
		mockInExisting.mockResolvedValueOnce({ data: [{ id: 'b-1' }], error: null } as never);
		const form = makeFormData({ ordered_ids: JSON.stringify(['b-1', 'b-2']) });
		const result = await actions.reorderBlocks({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 500 cuando Supabase falla al reordenar alguno', async () => {
		mockReorderUpdate
			.mockResolvedValueOnce({ error: null } as never)
			.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({ ordered_ids: JSON.stringify(['b-1', 'b-2']) });
		const result = await actions.reorderBlocks({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('reordena los bloques correctamente y registra auditoría', async () => {
		const form = makeFormData({ ordered_ids: JSON.stringify(['b-1', 'b-2']) });
		const result = await actions.reorderBlocks({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toEqual({ success: true });
		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});
});
