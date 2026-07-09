import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ─── Mocks de módulos ────────────────────────────────────────────────────────

mock.module('@sveltejs/kit', () => ({
	error: (status: number, msg: string) => {
		throw Object.assign(new Error(msg), { status });
	},
}));

const { load } = await import('./+page.server');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const PROJECT = { id: 'proj-1', name: 'Proyecto Test' };

const ASSETS = [
	{
		id: 'a-1',
		key: 'projects/1/full.webp',
		url: 'https://cdn.test/projects/1/full.webp',
		thumb_url: 'https://cdn.test/projects/1/thumb.webp',
		filename: 'foto.jpg',
		mime_type: 'image/jpeg',
		size_bytes: 1024,
		created_at: '2026-07-09T10:00:00Z',
	},
	{
		id: 'a-2',
		key: 'projects/1/doc.pdf',
		url: 'https://cdn.test/projects/1/doc.pdf',
		thumb_url: null,
		filename: 'documento.pdf',
		mime_type: 'application/pdf',
		size_bytes: 2048,
		created_at: '2026-07-09T09:00:00Z',
	},
];

// ─── Mocks de Supabase ────────────────────────────────────────────────────────

const mockProjectSingle = mock(() => Promise.resolve({ data: PROJECT, error: null }));
const mockAssetsOrder   = mock(() => Promise.resolve({ data: ASSETS, error: null }));

let capturedAssetsOrder: unknown = null; // para verificar parámetros de order()

function makeSupabase() {
	return {
		from: (table: string) => {
			if (table === 'projects') {
				return { select: () => ({ eq: () => ({ single: mockProjectSingle }) }) };
			}
			return {
				select: () => ({
					eq: () => ({
						order: (col: string, opts: unknown) => {
							capturedAssetsOrder = { col, opts };
							return mockAssetsOrder();
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

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
	capturedAssetsOrder = null;
	mockProjectSingle.mockReset();
	mockAssetsOrder.mockReset();
	mockProjectSingle.mockResolvedValue({ data: PROJECT, error: null } as never);
	mockAssetsOrder.mockResolvedValue({ data: ASSETS, error: null } as never);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('load assets — proyecto', () => {
	it('lanza 404 cuando el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await expect(load(makeEvent())).rejects.toMatchObject({ status: 404 });
	});

	it('devuelve el proyecto correctamente', async () => {
		const result = await load(makeEvent());
		expect(result.project).toMatchObject({ id: 'proj-1', name: 'Proyecto Test' });
	});

	it('consulta el proyecto con el projectId del params', async () => {
		let capturedId: unknown;
		const locals = {
			supabase: {
				from: (table: string) => {
					if (table === 'projects') {
						return {
							select: () => ({
								eq: (_col: string, val: unknown) => {
									capturedId = val;
									return { single: () => Promise.resolve({ data: PROJECT }) };
								},
							}),
						};
					}
					return {
						select: () => ({
							eq: () => ({
								order: () => Promise.resolve({ data: [], error: null }),
							}),
						}),
					};
				},
			},
		};
		await load({ locals: locals as never, params: { id: 'proj-99' } } as never);
		expect(capturedId).toBe('proj-99');
	});
});

describe('load assets — lista de assets', () => {
	it('devuelve los assets del proyecto', async () => {
		const result = await load(makeEvent());
		expect(result.assets).toHaveLength(2);
		expect(result.assets[0].id).toBe('a-1');
	});

	it('devuelve array vacío cuando Supabase no devuelve assets', async () => {
		mockAssetsOrder.mockResolvedValueOnce({ data: null, error: null } as never);
		const result = await load(makeEvent());
		expect(result.assets).toEqual([]);
	});

	it('devuelve array vacío cuando no hay assets en el proyecto', async () => {
		mockAssetsOrder.mockResolvedValueOnce({ data: [], error: null } as never);
		const result = await load(makeEvent());
		expect(result.assets).toEqual([]);
	});

	it('ordena por created_at descendente', async () => {
		await load(makeEvent());
		expect(capturedAssetsOrder).toMatchObject({
			col: 'created_at',
			opts: { ascending: false },
		});
	});

	it('devuelve assets con thumb_url null para no-imágenes', async () => {
		const result = await load(makeEvent());
		const pdf = result.assets.find((a: { mime_type: string }) => a.mime_type === 'application/pdf');
		expect(pdf?.thumb_url).toBeNull();
	});

	it('devuelve assets con thumb_url para imágenes procesadas', async () => {
		const result = await load(makeEvent());
		const img = result.assets.find((a: { mime_type: string }) => a.mime_type === 'image/jpeg');
		expect(img?.thumb_url).toBeTruthy();
	});
});
