import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';

// ─── Mocks de módulos ────────────────────────────────────────────────────────

mock.module('$env/static/private', () => ({
	CDN_WORKER_URL: 'https://cdn.test',
	CDN_UPLOAD_SECRET: 'test-secret',
}));

const { DELETE } = await import('./+server');

// ─── Helpers ─────────────────────────────────────────────────────────────────

type FetchArgs = { url: string; init: RequestInit };
let fetchCalls: FetchArgs[] = [];
const originalFetch = globalThis.fetch;

const ASSET_FULL = {
	id: 'asset-1',
	key: 'projects/1/full.webp',
	original_key: 'projects/1/original.jpg',
	cluster_key: 'projects/1/cluster.webp',
	thumb_key: 'projects/1/thumb.webp',
};

const ASSET_MINIMAL = {
	id: 'asset-2',
	key: 'projects/1/only.jpg',
	original_key: 'projects/1/only.jpg', // mismo que key — inicial sin variantes
	cluster_key: null,
	thumb_key: null,
};

const mockAssetSingle = mock(() => Promise.resolve({ data: ASSET_FULL }));
const mockDelete      = mock(() => Promise.resolve({ error: null }));

function makeSupabase() {
	return {
		from: () => ({
			select: () => ({ eq: () => ({ eq: () => ({ single: mockAssetSingle }) }) }),
			delete: () => ({ eq: () => ({ eq: mockDelete }) }),
		}),
	};
}

function makeEvent(opts?: {
	assetId?: string;
	projectId?: string;
	user?: object | null;
}): Parameters<typeof DELETE>[0] {
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
	fetchCalls = [];
	mockAssetSingle.mockReset();
	mockDelete.mockReset();
	mockAssetSingle.mockResolvedValue({ data: ASSET_FULL } as never);
	mockDelete.mockResolvedValue({ error: null } as never);
	globalThis.fetch = (async (url: string, init?: RequestInit) => {
		fetchCalls.push({ url, init: init ?? {} });
		return new Response(JSON.stringify({ ok: true }), { status: 200 });
	}) as typeof fetch;
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

// ─── Autenticación ────────────────────────────────────────────────────────────

describe('DELETE /assets/[assetId] — autenticación', () => {
	it('devuelve 401 sin sesión', async () => {
		const res = await DELETE(makeEvent({ user: null }));
		expect(res.status).toBe(401);
		expect((await res.json()).error).toMatch(/autenticado/i);
	});

	it('devuelve 404 cuando el asset no pertenece al proyecto', async () => {
		mockAssetSingle.mockResolvedValueOnce({ data: null } as never);
		const res = await DELETE(makeEvent());
		expect(res.status).toBe(404);
		expect((await res.json()).error).toMatch(/asset/i);
	});
});

// ─── Eliminación de keys en CDN ───────────────────────────────────────────────

describe('DELETE /assets/[assetId] — eliminación CDN', () => {
	it('elimina las 4 keys únicas del CDN cuando todas son distintas', async () => {
		await DELETE(makeEvent());
		const deleteCalls = fetchCalls.filter(c => c.url.includes('/delete'));
		expect(deleteCalls).toHaveLength(4);
	});

	it('deduplica: key === original_key → solo 3 llamadas CDN', async () => {
		mockAssetSingle.mockResolvedValueOnce({ data: ASSET_MINIMAL } as never);
		await DELETE(makeEvent({ assetId: 'asset-2' }));
		const deleteCalls = fetchCalls.filter(c => c.url.includes('/delete'));
		expect(deleteCalls).toHaveLength(1); // key y original_key son iguales, cluster y thumb son null
	});

	it('omite keys null (cluster, thumb) del DELETE al CDN', async () => {
		const assetSinVariantes = {
			id: 'asset-3',
			key: 'projects/1/main.webp',
			original_key: 'projects/1/orig.jpg',
			cluster_key: null,
			thumb_key: null,
		};
		mockAssetSingle.mockResolvedValueOnce({ data: assetSinVariantes } as never);
		await DELETE(makeEvent());
		const deleteCalls = fetchCalls.filter(c => c.url.includes('/delete'));
		expect(deleteCalls).toHaveLength(2);
	});

	it('usa Authorization Bearer con CDN_UPLOAD_SECRET en cada llamada', async () => {
		await DELETE(makeEvent());
		for (const call of fetchCalls) {
			expect(call.init.headers).toMatchObject({ Authorization: 'Bearer test-secret' });
		}
	});

	it('envía método DELETE al CDN con cada key en el body', async () => {
		await DELETE(makeEvent());
		const deleteCalls = fetchCalls.filter(c => c.url.includes('/delete'));
		for (const call of deleteCalls) {
			expect(call.init.method).toBe('DELETE');
			const body = JSON.parse(call.init.body as string);
			expect(body.key).toBeTruthy();
		}
	});

	it('continúa con la eliminación de Supabase aunque el CDN falle con error de red', async () => {
		globalThis.fetch = (async (url: string, init?: RequestInit) => {
			fetchCalls.push({ url, init: init ?? {} });
			if (url.includes('/delete')) throw new Error('Network error');
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		}) as typeof fetch;

		const res = await DELETE(makeEvent());
		// A pesar del error de red en CDN, la respuesta es 200 (Supabase delete continúa)
		expect(res.status).toBe(200);
		expect(mockDelete).toHaveBeenCalledTimes(1);
	});
});

// ─── Eliminación en Supabase ──────────────────────────────────────────────────

describe('DELETE /assets/[assetId] — Supabase', () => {
	it('devuelve 500 cuando Supabase delete falla', async () => {
		mockDelete.mockResolvedValueOnce({ error: { message: 'RLS policy violation' } } as never);
		const res = await DELETE(makeEvent());
		expect(res.status).toBe(500);
		expect((await res.json()).error).toMatch(/base de datos/i);
	});

	it('devuelve 200 con ok:true en éxito', async () => {
		const res = await DELETE(makeEvent());
		expect(res.status).toBe(200);
		expect((await res.json()).ok).toBe(true);
	});

	it('el delete de Supabase ocurre después de los deletes del CDN', async () => {
		const callOrder: string[] = [];
		globalThis.fetch = (async (url: string, init?: RequestInit) => {
			fetchCalls.push({ url, init: init ?? {} });
			callOrder.push('cdn-delete');
			return new Response(JSON.stringify({ ok: true }), { status: 200 });
		}) as typeof fetch;
		mockDelete.mockImplementationOnce((() => {
			callOrder.push('supabase-delete');
			return Promise.resolve({ error: null });
		}) as never);

		await DELETE(makeEvent());
		const cdnIdx  = callOrder.indexOf('cdn-delete');
		const supaIdx = callOrder.indexOf('supabase-delete');
		expect(cdnIdx).toBeLessThan(supaIdx);
	});

	it('asset con todas las keys null → no llama al CDN, sí elimina de Supabase', async () => {
		mockAssetSingle.mockResolvedValueOnce({
			data: { id: 'a', key: null, original_key: null, cluster_key: null, thumb_key: null },
		} as never);
		const res = await DELETE(makeEvent());
		expect(fetchCalls).toHaveLength(0); // ninguna key → cero llamadas CDN
		expect(res.status).toBe(200);
		expect(mockDelete).toHaveBeenCalledTimes(1);
	});
});
