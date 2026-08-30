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

const PROJECT = { id: 'proj-1', name: 'Proyecto Test' };

const COLLECTION = {
	id:     'col-1',
	name:   'Comités',
	slug:   'comites',
	schema: { base_path: '/modelo/es', fields: [] },
};

const ITEMS = [
	{ id: 'item-1', title: 'DISEC', slug: 'disec', full_path: '/modelo/es/disec', status: 'published', order: 1, created_at: '2026-01-01' },
	{ id: 'item-2', title: 'ECOSOC', slug: 'ecosoc', full_path: '/modelo/es/ecosoc', status: 'draft', order: 2, created_at: '2026-01-02' },
];

// ─── Mocks de Supabase ──────────────────────────────────────────────────────

const mockProjectSingle    = mock(() => Promise.resolve({ data: PROJECT, error: null }));
const mockCollectionSingle = mock(() => Promise.resolve({ data: COLLECTION, error: null }));
const mockItemsOrder       = mock(() => Promise.resolve({ data: ITEMS, error: null }));
const mockMaxOrderSingle   = mock(() => Promise.resolve({ data: { order: 2 }, error: null }));
const mockInsertSingle     = mock(() => Promise.resolve({ data: { id: 'item-new' }, error: null }));
const mockUpdateEq         = mock(() => Promise.resolve({ error: null }));
const mockDeleteEq         = mock(() => Promise.resolve({ error: null }));

let capturedInsert: unknown = null;
let capturedUpdate: unknown = null;

function makeSupabase() {
	return {
		from: (table: string) => {
			if (table === 'projects') {
				return { select: () => ({ eq: () => ({ single: mockProjectSingle }) }) };
			}
			if (table === 'collections') {
				return { select: () => ({ eq: () => ({ eq: () => ({ single: mockCollectionSingle }) }) }) };
			}
			if (table === 'collection_items') {
				return {
					select: () => ({
						eq: (col: string) => {
							if (col === 'collection_id') {
								return {
									order: (_c: string, opts?: { ascending?: boolean }) => {
										if (opts && opts.ascending === false) {
											return { limit: () => ({ single: mockMaxOrderSingle }) };
										}
										return mockItemsOrder();
									},
								};
							}
							// select(...).eq('collection_id',...) not matched — fallback chain
							return { eq: () => ({ single: mock(() => Promise.resolve({ data: null, error: null })) }) };
						},
					}),
					insert: (data: unknown) => {
						capturedInsert = data;
						return { select: () => ({ single: mockInsertSingle }) };
					},
					update: (data: unknown) => {
						capturedUpdate = data;
						return { eq: () => ({ eq: () => ({ eq: () => mockUpdateEq() }) }) };
					},
					delete: () => ({ eq: () => ({ eq: () => ({ eq: () => mockDeleteEq() }) }) }),
				};
			}
			throw new Error(`Tabla no mockeada: ${table}`);
		},
	};
}

function makeLocals() {
	return {
		supabase: makeSupabase(),
		safeGetSession: () => Promise.resolve({ user: { id: 'user-1', email: 'test@test.com' }, session: null }),
	};
}

function makeFormData(fields: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.append(k, v);
	return fd;
}

function makeEvent(projectId = 'proj-1', collectionId = 'col-1'): Parameters<typeof load>[0] {
	return {
		locals: makeLocals() as never,
		params: { id: projectId, collectionId },
	} as never;
}

// ─── Import dinámico después de los mocks ────────────────────────────────

const { load, actions } = await import('./+page.server');

type LoadResult = { project: typeof PROJECT; collection: typeof COLLECTION; items: typeof ITEMS };

// ─── Setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
	capturedInsert = null;
	capturedUpdate = null;
	mockProjectSingle.mockReset();
	mockCollectionSingle.mockReset();
	mockItemsOrder.mockReset();
	mockMaxOrderSingle.mockReset();
	mockInsertSingle.mockReset();
	mockUpdateEq.mockReset();
	mockDeleteEq.mockReset();
	mockLogProjectAudit.mockReset();

	mockProjectSingle.mockResolvedValue({ data: PROJECT, error: null } as never);
	mockCollectionSingle.mockResolvedValue({ data: COLLECTION, error: null } as never);
	mockItemsOrder.mockResolvedValue({ data: ITEMS, error: null } as never);
	mockMaxOrderSingle.mockResolvedValue({ data: { order: 2 }, error: null } as never);
	mockInsertSingle.mockResolvedValue({ data: { id: 'item-new' }, error: null } as never);
	mockUpdateEq.mockResolvedValue({ error: null } as never);
	mockDeleteEq.mockResolvedValue({ error: null } as never);
	mockLogProjectAudit.mockResolvedValue(undefined as never);
});

// ─── load ───────────────────────────────────────────────────────────────────

describe('load colección', () => {
	it('lanza 404 cuando el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await expect(load(makeEvent())).rejects.toMatchObject({ status: 404 });
	});

	it('lanza 404 cuando la colección no existe', async () => {
		mockCollectionSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await expect(load(makeEvent())).rejects.toMatchObject({ status: 404 });
	});

	it('devuelve proyecto, colección e ítems', async () => {
		const result = await load(makeEvent()) as LoadResult;
		expect(result.project).toMatchObject({ id: 'proj-1' });
		expect(result.collection).toMatchObject({ id: 'col-1', name: 'Comités' });
		expect(result.items).toHaveLength(2);
	});

	it('devuelve array vacío de ítems cuando Supabase no devuelve datos', async () => {
		mockItemsOrder.mockResolvedValueOnce({ data: null, error: null } as never);
		const result = await load(makeEvent()) as LoadResult;
		expect(result.items).toEqual([]);
	});
});

// ─── actions.create ───────────────────────────────────────────────────────

describe('actions.create', () => {
	it('devuelve 400 cuando falta el título', async () => {
		const form = makeFormData({ title: '', slug: '' });
		const result = await actions.create({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando el slug tiene caracteres inválidos', async () => {
		const form = makeFormData({ title: 'DISEC', slug: 'DISEC Invalido!' });
		const result = await actions.create({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('genera el slug a partir del título cuando no se provee', async () => {
		const form = makeFormData({ title: 'Comité de Prueba', slug: '' });
		const result = await actions.create({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(result).toEqual({ success: 'Ítem creado correctamente.' });
		expect(capturedInsert).toMatchObject({ slug: 'comite-de-prueba', full_path: '/modelo/es/comite-de-prueba' });
	});

	it('calcula el order siguiente a partir del máximo existente', async () => {
		mockMaxOrderSingle.mockResolvedValueOnce({ data: { order: 5 }, error: null } as never);
		const form = makeFormData({ title: 'Nuevo', slug: 'nuevo' });
		await actions.create({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(capturedInsert).toMatchObject({ order: 6 });
	});

	it('usa order 1 cuando no hay ítems previos', async () => {
		mockMaxOrderSingle.mockResolvedValueOnce({ data: null, error: null } as never);
		const form = makeFormData({ title: 'Nuevo', slug: 'nuevo' });
		await actions.create({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(capturedInsert).toMatchObject({ order: 1 });
	});

	it('devuelve 409 cuando ya existe un ítem con esa ruta', async () => {
		mockInsertSingle.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate' } } as never);
		const form = makeFormData({ title: 'DISEC', slug: 'disec' });
		const result = await actions.create({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 409 });
	});

	it('devuelve 500 cuando Supabase falla al insertar', async () => {
		mockInsertSingle.mockResolvedValueOnce({ data: null, error: { code: 'XXXXX', message: 'db error' } } as never);
		const form = makeFormData({ title: 'DISEC', slug: 'disec' });
		const result = await actions.create({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('registra auditoría al crear el ítem', async () => {
		const form = makeFormData({ title: 'DISEC', slug: 'disec' });
		await actions.create({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});
});

// ─── actions.toggleStatus ───────────────────────────────────────────────────

describe('actions.toggleStatus', () => {
	it('devuelve 400 cuando el nuevo estado es inválido', async () => {
		const form = makeFormData({ item_id: 'item-1', item_title: 'DISEC', new_status: 'archivado' });
		const result = await actions.toggleStatus({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 500 cuando Supabase falla al actualizar', async () => {
		mockUpdateEq.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({ item_id: 'item-1', item_title: 'DISEC', new_status: 'published' });
		const result = await actions.toggleStatus({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('publica el ítem correctamente', async () => {
		const form = makeFormData({ item_id: 'item-1', item_title: 'DISEC', new_status: 'published' });
		const result = await actions.toggleStatus({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(result).toEqual({ success: 'Ítem publicado.' });
		expect(capturedUpdate).toEqual({ status: 'published' });
	});

	it('despublica el ítem correctamente', async () => {
		const form = makeFormData({ item_id: 'item-1', item_title: 'DISEC', new_status: 'draft' });
		const result = await actions.toggleStatus({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(result).toEqual({ success: 'Ítem despublicado.' });
	});

	it('registra auditoría al cambiar el estado', async () => {
		const form = makeFormData({ item_id: 'item-1', item_title: 'DISEC', new_status: 'published' });
		await actions.toggleStatus({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});
});

// ─── actions.deleteItem ─────────────────────────────────────────────────────

describe('actions.deleteItem', () => {
	it('devuelve 500 cuando Supabase falla al eliminar', async () => {
		mockDeleteEq.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({ item_id: 'item-1', item_title: 'DISEC' });
		const result = await actions.deleteItem({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('elimina el ítem correctamente', async () => {
		const form = makeFormData({ item_id: 'item-1', item_title: 'DISEC' });
		const result = await actions.deleteItem({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(result).toEqual({ success: 'Ítem eliminado.' });
	});

	it('registra auditoría al eliminar el ítem', async () => {
		const form = makeFormData({ item_id: 'item-1', item_title: 'DISEC' });
		await actions.deleteItem({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1' },
		} as never);

		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});
});
