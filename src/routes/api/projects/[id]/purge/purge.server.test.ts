import { describe, it, expect, mock, beforeEach, afterEach, spyOn } from 'bun:test';

// El endpoint lee las credenciales CF de process.env en runtime (no $env/static/private),
// lo que evita conflictos de mock.module entre archivos de test en el mismo proceso Bun.

const { POST, fallback } = await import('./+server');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function cfOk() {
	return new Response(JSON.stringify({ success: true, errors: [] }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}

function cfErr(errors: { code: number }[]) {
	return new Response(JSON.stringify({ success: false, errors }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}

const mockProjectSingle = mock(() => Promise.resolve({ data: { id: 'proj-1' }, error: null }));

function makeLocals(user: object | null = { id: 'user-1' }) {
	return {
		safeGetSession: () => Promise.resolve({ user, session: null }),
		supabase: {
			from: () => ({ select: () => ({ eq: () => ({ single: mockProjectSingle }) }) }),
		},
	};
}

function makeEvent(opts?: { projectId?: string; user?: object | null }) {
	const { projectId = 'proj-1', user = { id: 'user-1' } } = opts ?? {};
	return {
		params: { id: projectId },
		locals: makeLocals(user) as never,
		request: {} as never,
	} as never;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('POST /api/projects/[id]/purge', () => {
	let fetchSpy: ReturnType<typeof spyOn>;

	beforeEach(() => {
		process.env['CLOUDFLARE_API_TOKEN'] = 'test-cf-token';
		process.env['CLOUDFLARE_ZONE_ID']   = 'test-zone-id';
		fetchSpy = spyOn(globalThis, 'fetch');
		mockProjectSingle.mockClear();
	});

	afterEach(() => {
		fetchSpy.mockRestore();
		delete process.env['CLOUDFLARE_API_TOKEN'];
		delete process.env['CLOUDFLARE_ZONE_ID'];
	});

	it('devuelve 401 si no autenticado', async () => {
		const res = await POST(makeEvent({ user: null }));
		expect(res.status).toBe(401);
	});

	it('devuelve 404 si el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: null } as never);
		const res = await POST(makeEvent());
		expect(res.status).toBe(404);
	});

	it('devuelve 200 y llama a CF API con el tag correcto', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk() as never);
		const res = await POST(makeEvent({ projectId: 'proj-42' }));
		expect(res.status).toBe(200);
		const body = await res.json() as { ok: boolean };
		expect(body.ok).toBe(true);

		const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('test-zone-id');
		expect(JSON.parse(init.body as string)).toEqual({ tags: ['project:proj-42'] });
	});

	it('devuelve 200 con fallback:true si CF responde error 1049 (plan Free/Pro)', async () => {
		fetchSpy.mockResolvedValueOnce(cfErr([{ code: 1049 }]) as never);
		const res = await POST(makeEvent());
		expect(res.status).toBe(200);
		const body = await res.json() as { ok: boolean; fallback: boolean };
		expect(body.ok).toBe(true);
		expect(body.fallback).toBe(true);
	});

	it('devuelve 502 si CF API responde error distinto a 1049', async () => {
		fetchSpy.mockResolvedValueOnce(cfErr([{ code: 9999 }]) as never);
		const res = await POST(makeEvent());
		expect(res.status).toBe(502);
	});

	it('devuelve 502 si fetch falla por red', async () => {
		fetchSpy.mockResolvedValueOnce(null as never);
		const res = await POST(makeEvent());
		expect(res.status).toBe(502);
	});

	it('envía Authorization Bearer correcto en el request a CF', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk() as never);
		await POST(makeEvent());
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-cf-token');
	});

	it('devuelve 405 para métodos no permitidos (fallback)', async () => {
		const res = await fallback({
			params: { id: 'proj-1' },
			locals: makeLocals() as never,
			request: new Request('http://localhost/api/projects/proj-1/purge', { method: 'GET' }),
		} as never);
		expect(res.status).toBe(405);
	});
});
