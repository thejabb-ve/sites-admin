import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ─── Mocks de módulos ────────────────────────────────────────────────────────

const { GET } = await import('./+server');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ASSETS = [
	{
		id: 'a-1',
		url: 'https://cdn.test/projects/1/full.webp',
		thumb_url: 'https://cdn.test/projects/1/thumb.webp',
		filename: 'foto.jpg',
		mime_type: 'image/jpeg',
		created_at: '2026-07-09T10:00:00Z',
	},
	{
		id: 'a-2',
		url: 'https://cdn.test/projects/1/doc.pdf',
		thumb_url: null,
		filename: 'documento.pdf',
		mime_type: 'application/pdf',
		created_at: '2026-07-09T09:00:00Z',
	},
];

// ─── Mocks de Supabase ────────────────────────────────────────────────────────

const mockAssetsOrder = mock(() => Promise.resolve({ data: ASSETS, error: null }));

let capturedProjectId: unknown = null;
let capturedOrder: unknown = null;

function makeSupabase() {
	return {
		from: () => ({
			select: () => ({
				eq: (_col: string, val: unknown) => {
					capturedProjectId = val;
					return {
						order: (col: string, opts: unknown) => {
							capturedOrder = { col, opts };
							return mockAssetsOrder();
						},
					};
				},
			}),
		}),
	};
}

function makeEvent(opts?: { projectId?: string; user?: object | null }): Parameters<typeof GET>[0] {
	const { projectId = 'proj-1', user = { id: 'user-1' } } = opts ?? {};
	return {
		params: { id: projectId },
		locals: {
			safeGetSession: () => Promise.resolve({ user, session: null }),
			supabase: makeSupabase(),
		},
	} as never;
}

beforeEach(() => {
	capturedProjectId = null;
	capturedOrder = null;
	mockAssetsOrder.mockReset();
	mockAssetsOrder.mockResolvedValue({ data: ASSETS, error: null } as never);
});

// ─── Autenticación ────────────────────────────────────────────────────────────

describe('GET /assets — autenticación', () => {
	it('devuelve 401 sin sesión', async () => {
		const res = await GET(makeEvent({ user: null }));
		expect(res.status).toBe(401);
		expect((await res.json()).error).toMatch(/autenticado/i);
	});
});

// ─── Caso feliz ────────────────────────────────────────────────────────────────

describe('GET /assets — caso feliz', () => {
	it('devuelve la lista de assets del proyecto', async () => {
		const res = await GET(makeEvent());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toHaveLength(2);
		expect(body[0].id).toBe('a-1');
	});

	it('consulta assets filtrando por el projectId del params', async () => {
		await GET(makeEvent({ projectId: 'proj-99' }));
		expect(capturedProjectId).toBe('proj-99');
	});

	it('ordena por created_at descendente', async () => {
		await GET(makeEvent());
		expect(capturedOrder).toMatchObject({
			col: 'created_at',
			opts: { ascending: false },
		});
	});
});

// ─── Supabase sin resultados / error ──────────────────────────────────────────

describe('GET /assets — Supabase sin resultados o con error', () => {
	it('devuelve array vacío cuando Supabase no devuelve assets (data: null)', async () => {
		mockAssetsOrder.mockResolvedValueOnce({ data: null, error: null } as never);
		const res = await GET(makeEvent());
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual([]);
	});

	it('devuelve array vacío cuando el proyecto no tiene assets', async () => {
		mockAssetsOrder.mockResolvedValueOnce({ data: [], error: null } as never);
		const res = await GET(makeEvent());
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual([]);
	});

	it('devuelve array vacío (sin lanzar) cuando Supabase responde con error', async () => {
		mockAssetsOrder.mockResolvedValueOnce({
			data: null,
			error: { message: 'connection error' },
		} as never);
		const res = await GET(makeEvent());
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual([]);
	});
});
