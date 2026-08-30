import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ─── Mocks de módulos ────────────────────────────────────────────────────────

const { GET } = await import('./+server');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ASSET = {
	id: 'asset-1',
	key: 'projects/1/full.webp',
	url: 'https://cdn.test/projects/1/full.webp',
	thumb_url: 'https://cdn.test/projects/1/thumb.webp',
	filename: 'foto.jpg',
	mime_type: 'image/jpeg',
	size_bytes: 1024,
	created_at: '2026-07-09T10:00:00Z',
};

// ─── Mocks de Supabase ────────────────────────────────────────────────────────

const mockAssetSingle = mock(() => Promise.resolve({ data: ASSET }));

let capturedAssetId: unknown = null;
let capturedProjectId: unknown = null;

function makeSupabase() {
	return {
		from: () => ({
			select: () => ({
				eq: (_col: string, assetId: unknown) => {
					capturedAssetId = assetId;
					return {
						eq: (_col2: string, projectId: unknown) => {
							capturedProjectId = projectId;
							return { single: mockAssetSingle };
						},
					};
				},
			}),
		}),
	};
}

function makeEvent(opts?: {
	assetId?: string;
	projectId?: string;
	user?: object | null;
}): Parameters<typeof GET>[0] {
	const { assetId = 'asset-1', projectId = 'proj-1', user = { id: 'user-1' } } = opts ?? {};
	return {
		params: { id: projectId, assetId },
		locals: {
			safeGetSession: () => Promise.resolve({ user, session: null }),
			supabase: makeSupabase(),
		},
	} as never;
}

beforeEach(() => {
	capturedAssetId = null;
	capturedProjectId = null;
	mockAssetSingle.mockReset();
	mockAssetSingle.mockResolvedValue({ data: ASSET } as never);
});

// ─── Autenticación ────────────────────────────────────────────────────────────

describe('GET /assets/[assetId] — autenticación', () => {
	it('devuelve 401 sin sesión', async () => {
		const res = await GET(makeEvent({ user: null }));
		expect(res.status).toBe(401);
		expect((await res.json()).error).toMatch(/autenticado/i);
	});
});

// ─── Caso feliz ────────────────────────────────────────────────────────────────

describe('GET /assets/[assetId] — caso feliz', () => {
	it('devuelve el asset envuelto en { asset }', async () => {
		const res = await GET(makeEvent());
		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.asset).toMatchObject({ id: 'asset-1', filename: 'foto.jpg' });
	});

	it('filtra por assetId y projectId de params', async () => {
		await GET(makeEvent({ assetId: 'asset-42', projectId: 'proj-7' }));
		expect(capturedAssetId).toBe('asset-42');
		expect(capturedProjectId).toBe('proj-7');
	});
});

// ─── No encontrado ────────────────────────────────────────────────────────────

describe('GET /assets/[assetId] — no encontrado', () => {
	it('devuelve 404 cuando el asset no existe o no pertenece al proyecto', async () => {
		mockAssetSingle.mockResolvedValueOnce({ data: null } as never);
		const res = await GET(makeEvent());
		expect(res.status).toBe(404);
		expect((await res.json()).error).toMatch(/asset/i);
	});
});
