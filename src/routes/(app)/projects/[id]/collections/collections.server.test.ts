import { describe, it, expect, mock, beforeEach } from 'bun:test';
import * as sveltekit from '@sveltejs/kit';

// ─── Mocks de SvelteKit ────────────────────────────────────────────────────
// Se preserva el resto del módulo real (json, redirect, ...) para no romper
// otros test files que importan @sveltejs/kit en la misma corrida de `bun test src`.

mock.module('@sveltejs/kit', () => ({
	...sveltekit,
	error: (status: number, msg: string) => { throw Object.assign(new Error(msg), { status }); },
}));

// ─── Fixtures ────────────────────────────────────────────────────────────

const PROJECT = { id: 'proj-1', name: 'Proyecto Test' };

const COLLECTIONS = [
	{ id: 'col-1', name: 'Comités', slug: 'comites', collection_items: [{ count: 20 }] },
	{ id: 'col-2', name: 'Artículos', slug: 'articulos', collection_items: [{ count: 4 }] },
];

// ─── Mocks de Supabase ────────────────────────────────────────────────────

const mockProjectSingle     = mock(() => Promise.resolve({ data: PROJECT, error: null }));
const mockCollectionsOrder  = mock(() => Promise.resolve({ data: COLLECTIONS, error: null }));

let capturedOrderCol: unknown = null;

function makeSupabase() {
	return {
		from: (table: string) => {
			if (table === 'projects') {
				return { select: () => ({ eq: () => ({ single: mockProjectSingle }) }) };
			}
			return {
				select: () => ({
					eq: () => ({
						order: (col: string) => {
							capturedOrderCol = col;
							return mockCollectionsOrder();
						},
					}),
				}),
			};
		},
	};
}

function makeLocals() {
	return { supabase: makeSupabase() };
}

function makeEvent(projectId = 'proj-1'): Parameters<typeof load>[0] {
	return {
		locals: makeLocals() as never,
		params: { id: projectId },
	} as never;
}

// ─── Import dinámico después de los mocks ────────────────────────────────

const { load } = await import('./+page.server');

type LoadResult = { project: typeof PROJECT; collections: typeof COLLECTIONS };

// ─── Setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
	capturedOrderCol = null;
	mockProjectSingle.mockReset();
	mockCollectionsOrder.mockReset();
	mockProjectSingle.mockResolvedValue({ data: PROJECT, error: null } as never);
	mockCollectionsOrder.mockResolvedValue({ data: COLLECTIONS, error: null } as never);
});

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('load colecciones — proyecto', () => {
	it('lanza 404 cuando el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await expect(load(makeEvent())).rejects.toMatchObject({ status: 404 });
	});

	it('devuelve el proyecto correctamente', async () => {
		const result = await load(makeEvent()) as LoadResult;
		expect(result.project).toMatchObject({ id: 'proj-1', name: 'Proyecto Test' });
	});
});

describe('load colecciones — lista', () => {
	it('devuelve las colecciones del proyecto con el conteo de ítems', async () => {
		const result = await load(makeEvent()) as LoadResult;
		expect(result.collections).toHaveLength(2);
		expect(result.collections[0]).toMatchObject({ id: 'col-1', name: 'Comités' });
	});

	it('devuelve array vacío cuando Supabase no devuelve colecciones', async () => {
		mockCollectionsOrder.mockResolvedValueOnce({ data: null, error: null } as never);
		const result = await load(makeEvent()) as LoadResult;
		expect(result.collections).toEqual([]);
	});

	it('devuelve array vacío cuando el proyecto no tiene colecciones', async () => {
		mockCollectionsOrder.mockResolvedValueOnce({ data: [], error: null } as never);
		const result = await load(makeEvent()) as LoadResult;
		expect(result.collections).toEqual([]);
	});

	it('ordena por name', async () => {
		await load(makeEvent());
		expect(capturedOrderCol).toBe('name');
	});
});
