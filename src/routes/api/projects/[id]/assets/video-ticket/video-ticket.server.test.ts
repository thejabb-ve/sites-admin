import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';

// ─── Mocks de módulos ────────────────────────────────────────────────────────

mock.module('$env/static/private', () => ({
	CDN_WORKER_URL:            'https://cdn.test',
	CDN_UPLOAD_SECRET:         'test-secret',
	SUPABASE_SERVICE_ROLE_KEY: 'dummy-svc-key', // requerido por upload/+server.ts al cargarse en el mismo worker
}));

const { POST } = await import('./+server');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const TICKET_RESPONSE = { ticket: 'hmac-ticket-abc', expires: '9999999999000', projectId: 'proj-1' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

type FetchArgs = { url: string; init: RequestInit };
let fetchCalls: FetchArgs[] = [];
const originalFetch = globalThis.fetch;

const mockProjectSingle = mock(() => Promise.resolve({ data: { id: 'proj-1' }, error: null }));

function makeSupabase() {
	return {
		from: () => ({ select: () => ({ eq: () => ({ single: mockProjectSingle }) }) }),
	};
}

function makeEvent(opts?: { projectId?: string; user?: object | null }): Parameters<typeof POST>[0] {
	const { projectId = 'proj-1', user = { id: 'user-1' } } = opts ?? {};
	return {
		params: { id: projectId },
		locals: {
			safeGetSession: () => Promise.resolve({ user, session: null }),
			supabase:       makeSupabase(),
		},
	} as never;
}

beforeEach(() => {
	fetchCalls = [];
	mockProjectSingle.mockReset();
	mockProjectSingle.mockResolvedValue({ data: { id: 'proj-1' }, error: null } as never);
	globalThis.fetch = (async (url: string, init?: RequestInit) => {
		fetchCalls.push({ url, init: init ?? {} });
		return new Response(JSON.stringify(TICKET_RESPONSE), { status: 200 });
	}) as typeof fetch;
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

// ─── Autenticación ────────────────────────────────────────────────────────────

describe('POST /assets/video-ticket — autenticación', () => {
	it('devuelve 401 sin sesión', async () => {
		const res = await POST(makeEvent({ user: null }));
		expect(res.status).toBe(401);
		expect((await res.json()).error).toMatch(/autenticado/i);
	});

	it('no llama al CDN si el usuario no está autenticado', async () => {
		await POST(makeEvent({ user: null }));
		expect(fetchCalls).toHaveLength(0);
	});
});

// ─── Verificación de proyecto ─────────────────────────────────────────────────

describe('POST /assets/video-ticket — proyecto', () => {
	it('devuelve 404 cuando el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		const res = await POST(makeEvent());
		expect(res.status).toBe(404);
		expect((await res.json()).error).toMatch(/proyecto/i);
	});

	it('no llama al CDN si el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await POST(makeEvent());
		expect(fetchCalls).toHaveLength(0);
	});
});

// ─── Llamada al CDN ───────────────────────────────────────────────────────────

describe('POST /assets/video-ticket — llamada al CDN', () => {
	it('llama a /upload-ticket del CDN con Bearer', async () => {
		await POST(makeEvent());
		expect(fetchCalls).toHaveLength(1);
		expect(fetchCalls[0].url).toBe('https://cdn.test/upload-ticket');
		expect((fetchCalls[0].init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-secret');
	});

	it('envía el project_id correcto en el body al CDN', async () => {
		await POST(makeEvent({ projectId: 'proj-99' }));
		const body = JSON.parse(fetchCalls[0].init.body as string);
		expect(body.project_id).toBe('proj-99');
	});

	it('devuelve 502 cuando el CDN responde con error', async () => {
		globalThis.fetch = (async () =>
			new Response('Internal Error', { status: 500 })
		) as typeof fetch;
		const res = await POST(makeEvent());
		expect(res.status).toBe(502);
		expect((await res.json()).error).toMatch(/ticket/i);
	});

	it('devuelve 502 cuando el CDN lanza error de red', async () => {
		globalThis.fetch = (async () => { throw new Error('Network error'); }) as typeof fetch;
		const res = await POST(makeEvent());
		expect(res.status).toBe(502);
	});
});

// ─── Respuesta exitosa ────────────────────────────────────────────────────────

describe('POST /assets/video-ticket — respuesta', () => {
	it('devuelve cdnUrl, ticket, expires y projectId', async () => {
		const res  = await POST(makeEvent());
		const body = await res.json() as Record<string, string>;
		expect(res.status).toBe(200);
		expect(body.cdnUrl).toBe('https://cdn.test');
		expect(body.ticket).toBe(TICKET_RESPONSE.ticket);
		expect(body.expires).toBe(TICKET_RESPONSE.expires);
		expect(body.projectId).toBe(TICKET_RESPONSE.projectId);
	});

	it('el Content-Type de la respuesta es application/json', async () => {
		const res = await POST(makeEvent());
		expect(res.headers.get('Content-Type')).toBe('application/json');
	});
});
