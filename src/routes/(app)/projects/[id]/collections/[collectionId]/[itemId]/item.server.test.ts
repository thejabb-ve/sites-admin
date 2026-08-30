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

const SCHEMA = {
	base_path: '/modelo/es',
	fields: [
		{ key: 'topic', type: 'text', label: 'Tema' },
		{ key: 'tags',  type: 'text', label: 'Etiquetas' },
	],
};

const COLLECTION = { id: 'col-1', name: 'Comités', slug: 'comites', schema: SCHEMA };

const ITEM = {
	id:         'item-1',
	title:      'DISEC',
	slug:       'disec',
	full_path:  '/modelo/es/disec',
	status:     'draft',
	order:      1,
	fields:     { topic: 'Desarme', tags: ['seguridad', 'paz'] },
};

// ─── Mocks de Supabase ──────────────────────────────────────────────────────

const mockProjectSingle    = mock(() => Promise.resolve({ data: PROJECT, error: null }));
const mockCollectionSingle = mock(() => Promise.resolve({ data: COLLECTION, error: null }));
const mockItemSingle       = mock(() => Promise.resolve({ data: ITEM, error: null }));
const mockCurrentFieldsSingle = mock(() => Promise.resolve({ data: { fields: ITEM.fields }, error: null }));
const mockUpdateEq         = mock(() => Promise.resolve({ error: null }));

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
					select: (cols: string) => ({
						eq: () => ({
							eq: () => ({
								single: cols === 'fields' ? mockCurrentFieldsSingle : mockItemSingle,
							}),
						}),
					}),
					update: (data: unknown) => {
						capturedUpdate = data;
						return { eq: () => ({ eq: () => mockUpdateEq() }) };
					},
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

function makeEvent(projectId = 'proj-1', collectionId = 'col-1', itemId = 'item-1'): Parameters<typeof load>[0] {
	return {
		locals: makeLocals() as never,
		params: { id: projectId, collectionId, itemId },
	} as never;
}

// ─── Import dinámico después de los mocks ────────────────────────────────

const { load, actions } = await import('./+page.server');

type LoadResult = { project: typeof PROJECT; collection: typeof COLLECTION; item: typeof ITEM };

const VALID_UPDATE_FIELDS = {
	title:     'DISEC actualizado',
	slug:      'disec-actualizado',
	full_path: '/modelo/es/disec-actualizado',
	order:     '2',
	status:    'published',
	topic:     'Desarme nuclear',
	tags:      'seguridad\npaz\ndesarme',
};

// ─── Setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
	capturedUpdate = null;
	mockProjectSingle.mockReset();
	mockCollectionSingle.mockReset();
	mockItemSingle.mockReset();
	mockCurrentFieldsSingle.mockReset();
	mockUpdateEq.mockReset();
	mockLogProjectAudit.mockReset();

	mockProjectSingle.mockResolvedValue({ data: PROJECT, error: null } as never);
	mockCollectionSingle.mockResolvedValue({ data: COLLECTION, error: null } as never);
	mockItemSingle.mockResolvedValue({ data: ITEM, error: null } as never);
	mockCurrentFieldsSingle.mockResolvedValue({ data: { fields: ITEM.fields }, error: null } as never);
	mockUpdateEq.mockResolvedValue({ error: null } as never);
	mockLogProjectAudit.mockResolvedValue(undefined as never);
});

// ─── load ───────────────────────────────────────────────────────────────────

describe('load ítem de colección', () => {
	it('lanza 404 cuando el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await expect(load(makeEvent())).rejects.toMatchObject({ status: 404 });
	});

	it('lanza 404 cuando la colección no existe', async () => {
		mockCollectionSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await expect(load(makeEvent())).rejects.toMatchObject({ status: 404 });
	});

	it('lanza 404 cuando el ítem no existe', async () => {
		mockItemSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await expect(load(makeEvent())).rejects.toMatchObject({ status: 404 });
	});

	it('devuelve proyecto, colección e ítem', async () => {
		const result = await load(makeEvent()) as LoadResult;
		expect(result.project).toMatchObject({ id: 'proj-1' });
		expect(result.collection).toMatchObject({ id: 'col-1' });
		expect(result.item).toMatchObject({ id: 'item-1', title: 'DISEC' });
	});
});

// ─── actions.update ─────────────────────────────────────────────────────────

describe('actions.update', () => {
	it('devuelve 400 cuando falta el título', async () => {
		const form = makeFormData({ ...VALID_UPDATE_FIELDS, title: '' });
		const result = await actions.update({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1', itemId: 'item-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando el slug tiene caracteres inválidos', async () => {
		const form = makeFormData({ ...VALID_UPDATE_FIELDS, slug: 'Inválido Slug!' });
		const result = await actions.update({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1', itemId: 'item-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando el estado es inválido', async () => {
		const form = makeFormData({ ...VALID_UPDATE_FIELDS, status: 'archivado' });
		const result = await actions.update({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1', itemId: 'item-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando la ruta completa no es válida', async () => {
		const form = makeFormData({ ...VALID_UPDATE_FIELDS, full_path: 'sin-slash-inicial' });
		const result = await actions.update({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1', itemId: 'item-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 409 cuando ya existe un ítem con esa ruta', async () => {
		mockUpdateEq.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } } as never);
		const form = makeFormData(VALID_UPDATE_FIELDS);
		const result = await actions.update({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1', itemId: 'item-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 409 });
	});

	it('devuelve 500 cuando Supabase falla al guardar', async () => {
		mockUpdateEq.mockResolvedValueOnce({ error: { code: 'XXXXX', message: 'db error' } } as never);
		const form = makeFormData(VALID_UPDATE_FIELDS);
		const result = await actions.update({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1', itemId: 'item-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('guarda los cambios correctamente', async () => {
		const form = makeFormData(VALID_UPDATE_FIELDS);
		const result = await actions.update({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1', itemId: 'item-1' },
		} as never);

		expect(result).toEqual({ success: 'Cambios guardados correctamente.' });
		expect(capturedUpdate).toMatchObject({
			title:     'DISEC actualizado',
			slug:      'disec-actualizado',
			full_path: '/modelo/es/disec-actualizado',
			order:     2,
			status:    'published',
		});
	});

	it('convierte campos de texto plano según el tipo del valor actual (string vs array)', async () => {
		const form = makeFormData(VALID_UPDATE_FIELDS);
		await actions.update({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1', itemId: 'item-1' },
		} as never);

		const saved = capturedUpdate as { fields: Record<string, unknown> };
		expect(saved.fields['topic']).toBe('Desarme nuclear');
		expect(saved.fields['tags']).toEqual(['seguridad', 'paz', 'desarme']);
	});

	it('filtra líneas vacías al convertir un campo array', async () => {
		const form = makeFormData({ ...VALID_UPDATE_FIELDS, tags: 'seguridad\n\n  \npaz' });
		await actions.update({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1', itemId: 'item-1' },
		} as never);

		const saved = capturedUpdate as { fields: Record<string, unknown> };
		expect(saved.fields['tags']).toEqual(['seguridad', 'paz']);
	});

	it('registra auditoría al guardar los cambios', async () => {
		const form = makeFormData(VALID_UPDATE_FIELDS);
		await actions.update({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', collectionId: 'col-1', itemId: 'item-1' },
		} as never);

		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});
});
