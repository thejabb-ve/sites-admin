import { describe, it, expect, mock, beforeEach } from 'bun:test';
import * as sveltekit from '@sveltejs/kit';

// ─── Mocks de SvelteKit ────────────────────────────────────────────────────
// Se preserva el resto del módulo real (json, redirect, ...) para no romper
// otros test files que importan @sveltejs/kit en la misma corrida de `bun test src`.

mock.module('@sveltejs/kit', () => ({
	...sveltekit,
	error: (status: number, msg: string) => { throw Object.assign(new Error(msg), { status }); },
}));

// ─── Import dinámico después de los mocks ────────────────────────────────

const { requireProject } = await import('./project');

// ─── Mock de Supabase ──────────────────────────────────────────────────────

const mockSingle = mock(() => Promise.resolve({ data: null, error: null }));

let capturedTable:   string | undefined;
let capturedColumns: string | undefined;
let capturedEqCol:   string | undefined;
let capturedEqVal:   string | undefined;

function makeSupabase() {
	return {
		from: (table: string) => {
			capturedTable = table;
			return {
				select: (columns: string) => {
					capturedColumns = columns;
					return {
						eq: (col: string, val: string) => {
							capturedEqCol = col;
							capturedEqVal = val;
							return { single: mockSingle };
						},
					};
				},
			};
		},
	};
}

beforeEach(() => {
	capturedTable = undefined;
	capturedColumns = undefined;
	capturedEqCol = undefined;
	capturedEqVal = undefined;
	mockSingle.mockReset();
	mockSingle.mockResolvedValue({ data: null, error: null } as never);
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe('requireProject', () => {
	it('devuelve el proyecto cuando existe', async () => {
		const project = { id: 'proj-1', name: 'Test' };
		mockSingle.mockResolvedValueOnce({ data: project, error: null } as never);

		const result = await requireProject(makeSupabase() as never, 'proj-1', 'id, name');

		expect(result).toEqual(project);
	});

	it('lanza 404 con el mensaje por defecto cuando el proyecto no existe', async () => {
		mockSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);

		await expect(
			requireProject(makeSupabase() as never, 'proj-x', 'id')
		).rejects.toMatchObject({ status: 404, message: 'Proyecto no encontrado.' });
	});

	it('lanza 404 con mensaje personalizado cuando se pasa uno', async () => {
		mockSingle.mockResolvedValueOnce({ data: null, error: null } as never);

		await expect(
			requireProject(makeSupabase() as never, 'proj-x', 'id', 'No tienes acceso a este proyecto.')
		).rejects.toMatchObject({ status: 404, message: 'No tienes acceso a este proyecto.' });
	});

	it('consulta la tabla projects filtrando por id con las columnas pedidas', async () => {
		mockSingle.mockResolvedValueOnce({ data: { id: 'proj-1' }, error: null } as never);

		await requireProject(makeSupabase() as never, 'proj-1', 'id, name, canonical_domain');

		expect(capturedTable).toBe('projects');
		expect(capturedColumns).toBe('id, name, canonical_domain');
		expect(capturedEqCol).toBe('id');
		expect(capturedEqVal).toBe('proj-1');
	});

	it('lanza 404 aunque haya data si data es un valor falsy (defensivo)', async () => {
		// project = undefined también debe tratarse como "no encontrado"
		mockSingle.mockResolvedValueOnce({ data: undefined, error: null } as never);

		await expect(
			requireProject(makeSupabase() as never, 'proj-x', 'id')
		).rejects.toMatchObject({ status: 404 });
	});
});
