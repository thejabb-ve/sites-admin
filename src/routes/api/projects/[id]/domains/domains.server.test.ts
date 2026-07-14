import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ── Mocks (antes del import dinámico) ─────────────────────────────────────────

mock.module('$env/static/private', () => ({
	CLOUDFLARE_API_TOKEN:  'test-cf-token',
	CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
	VERCEL_API_TOKEN:      'test-vercel-token',
	VERCEL_PROJECT_ID:     'test-project-id',
	RESEND_API_KEY:        'test-resend-key',
	RESEND_FROM_EMAIL:     'noreply@test.com',
	ALERT_EMAIL:           'alertas@test.com',
}));

// Se usan $lib/ para que no colisionen con los mocks de paths relativos en lib/*.test.ts
const mockCheckAvailability = mock(async () => ({ available: true }));
mock.module('$lib/cloudflare-registrar.server', () => ({
	checkAvailability: mockCheckAvailability,
}));

const mockStartDomainSetup = mock(() => undefined); // sync — dispara waitUntil internamente
const mockDisconnectDomain = mock(async () => undefined);
mock.module('$lib/domain-setup.server', () => ({
	startDomainSetup: mockStartDomainSetup,
	disconnectDomain: mockDisconnectDomain,
}));

const { GET, POST, DELETE, fallback } = await import('./+server');

// ── Helpers ───────────────────────────────────────────────────────────────────

const AUTHENTICATED_USER = { id: 'user-uuid', email: 'user@test.com' };

function makeLocals(
	user: { id: string; email: string } | null,
	supabase: unknown,
) {
	return {
		safeGetSession: () => Promise.resolve({ user, session: null }),
		supabase,
	};
}

/**
 * Construye un mock de Supabase adaptado a los patrones de queries del endpoint.
 * Los resultados se configuran por operación, no por table (el endpoint llama
 * siempre a `domains` y `projects` en orden predecible).
 */
function makeSupabase(config: {
	project?:      { id: string; name: string } | null;
	existing?:     { id: string } | null;           // domain duplicado
	inserted?:     { id: string } | null;           // domain recién insertado
	insertError?:  boolean;
	foundDomain?:  { id: string; domain: string } | null;  // DELETE lookup
	statusDomain?: Record<string, unknown> | null;         // GET ?statusOf
}) {
	// single() devuelve la respuesta según el contexto que el test configuró
	const singleQueue: Array<{ data: unknown; error: unknown }> = [];

	if (config.project !== undefined) singleQueue.push({ data: config.project, error: null });
	// La DB tiene dos singles más (existing usa maybeSingle, no single)
	if (config.inserted !== undefined || config.insertError) {
		singleQueue.push({
			data:  config.insertError ? null : (config.inserted ?? { id: 'new-domain-id' }),
			error: config.insertError ? { message: 'DB error' } : null,
		});
	}
	if (config.foundDomain !== undefined) singleQueue.push({ data: config.foundDomain, error: null });
	if (config.statusDomain !== undefined) singleQueue.push({ data: config.statusDomain, error: null });

	let singleIdx = 0;

	const single    = mock(async () => singleQueue[singleIdx++] ?? { data: null, error: null });
	const maybeSingle = mock(async () => ({ data: config.existing ?? null, error: null }));
	const eqChain   = { single, maybeSingle, eq: (null as unknown) as () => unknown };
	eqChain.eq = () => eqChain;
	const select    = mock(() => eqChain);
	const insertSingle = mock(async () => singleQueue[singleIdx++] ?? { data: null, error: null });
	const insertSelect = mock(() => ({ single: insertSingle }));
	const insert    = mock(() => ({ select: insertSelect }));
	const from      = mock(() => ({ select, insert }));

	return { from, _single: single, _maybeSingle: maybeSingle, _insert: insert };
}

function makeEvent(opts: {
	projectId?: string;
	user?:      { id: string; email: string } | null;
	supabase?:  unknown;
	method?:    string;
	body?:      unknown;
	search?:    string;
}) {
	const {
		projectId = 'proj-1',
		user      = AUTHENTICATED_USER,
		supabase  = makeSupabase({}),
		method    = 'GET',
		body,
		search    = '',
	} = opts;

	const url = new URL(`http://localhost/api/projects/${projectId}/domains${search}`);
	return {
		params:  { id: projectId },
		locals:  makeLocals(user, supabase),
		url,
		request: new Request(url, {
			method,
			body:    body ? JSON.stringify(body) : undefined,
			headers: body ? { 'Content-Type': 'application/json' } : {},
		}),
	} as never;
}

beforeEach(() => {
	mockCheckAvailability.mockClear();
	mockStartDomainSetup.mockClear();
	mockDisconnectDomain.mockClear();
	mockCheckAvailability.mockImplementation(async () => ({ available: true }));
	mockStartDomainSetup.mockImplementation(() => undefined);
	mockDisconnectDomain.mockImplementation(async () => undefined);
});

// ── GET ?check=domain ─────────────────────────────────────────────────────────

describe('GET ?check=domain', () => {
	it('devuelve 401 si el usuario no está autenticado', async () => {
		const res = await GET(makeEvent({ user: null, search: '?check=libre.com' }));
		expect(res.status).toBe(401);
	});

	it('devuelve 400 si el dominio tiene formato inválido', async () => {
		const res = await GET(makeEvent({ search: '?check=no-es-un-dominio' }));
		expect(res.status).toBe(400);
	});

	it('devuelve 400 para cadenas vacías', async () => {
		const res = await GET(makeEvent({ search: '?check=' }));
		expect(res.status).toBe(400);
	});

	it('devuelve 400 para dominios con protocolo incluido', async () => {
		const res = await GET(makeEvent({ search: '?check=https://dominio.com' }));
		expect(res.status).toBe(400);
	});

	it('devuelve available=true si el dominio está libre', async () => {
		mockCheckAvailability.mockResolvedValueOnce({ available: true });
		const res = await GET(makeEvent({ search: '?check=libre.com' }));
		expect(res.status).toBe(200);
		const body = await res.json() as { available: boolean };
		expect(body.available).toBe(true);
	});

	it('devuelve available=false si el dominio está tomado', async () => {
		mockCheckAvailability.mockResolvedValueOnce({ available: false });
		const res = await GET(makeEvent({ search: '?check=tomado.com' }));
		expect(res.status).toBe(200);
		const body = await res.json() as { available: boolean };
		expect(body.available).toBe(false);
	});

	it('llama a checkAvailability con el dominio correcto', async () => {
		await GET(makeEvent({ search: '?check=midominio.io' }));
		expect((mockCheckAvailability.mock.calls as unknown as [[string]])[0][0]).toBe('midominio.io');
	});

	it('devuelve 502 si checkAvailability lanza un error', async () => {
		mockCheckAvailability.mockRejectedValueOnce(new Error('RDAP timeout'));
		const res = await GET(makeEvent({ search: '?check=libre.com' }));
		expect(res.status).toBe(502);
	});
});

// ── GET ?statusOf=domainId ────────────────────────────────────────────────────

describe('GET ?statusOf=domainId', () => {
	it('devuelve 401 si no autenticado', async () => {
		const res = await GET(makeEvent({ user: null, search: '?statusOf=dom-1' }));
		expect(res.status).toBe(401);
	});

	it('devuelve 404 si el dominio no existe o no pertenece al proyecto', async () => {
		const sb = makeSupabase({ statusDomain: null });
		const res = await GET(makeEvent({ supabase: sb, search: '?statusOf=no-existe' }));
		expect(res.status).toBe(404);
	});

	it('devuelve 200 con los datos del dominio', async () => {
		const domData = { id: 'dom-1', status: 'configuring', error_message: null, cf_zone_id: null, vercel_domain_id: null };
		const sb = makeSupabase({ statusDomain: domData });
		const res = await GET(makeEvent({ supabase: sb, search: '?statusOf=dom-1' }));
		expect(res.status).toBe(200);
		const body = await res.json() as typeof domData;
		expect(body.status).toBe('configuring');
	});

	it('devuelve los campos de estado relevantes para el wizard', async () => {
		const domData = { id: 'dom-1', status: 'active', error_message: null, cf_zone_id: 'z-1', vercel_domain_id: 'v-1' };
		const sb = makeSupabase({ statusDomain: domData });
		const res = await GET(makeEvent({ supabase: sb, search: '?statusOf=dom-1' }));
		const body = await res.json() as typeof domData;
		expect(body.cf_zone_id).toBe('z-1');
		expect(body.vercel_domain_id).toBe('v-1');
	});
});

// ── GET sin parámetros ────────────────────────────────────────────────────────

describe('GET sin parámetros válidos', () => {
	it('devuelve 400 si no hay check ni statusOf', async () => {
		const res = await GET(makeEvent({ search: '' }));
		expect(res.status).toBe(400);
	});
});

// ── POST ──────────────────────────────────────────────────────────────────────

describe('POST — crear dominio', () => {
	it('devuelve 401 si no autenticado', async () => {
		const res = await POST(makeEvent({ user: null, method: 'POST', body: { domain: 'test.com' } }));
		expect(res.status).toBe(401);
	});

	it('devuelve 404 si el proyecto no existe', async () => {
		const sb = makeSupabase({ project: null });
		const res = await POST(makeEvent({ supabase: sb, method: 'POST', body: { domain: 'test.com' } }));
		expect(res.status).toBe(404);
	});

	it('devuelve 400 si el body JSON es inválido', async () => {
		const sb = makeSupabase({ project: { id: 'p1', name: 'Test' } });
		const event = makeEvent({ supabase: sb, method: 'POST' });
		(event as never as { request: Request }).request = new Request('http://localhost/', {
			method: 'POST',
			body:   'no es json',
			headers: { 'Content-Type': 'application/json' },
		});
		const res = await POST(event);
		expect(res.status).toBe(400);
	});

	it('devuelve 400 si el dominio tiene formato inválido', async () => {
		const sb = makeSupabase({ project: { id: 'p1', name: 'Test' } });
		const res = await POST(makeEvent({ supabase: sb, method: 'POST', body: { domain: 'no-valido' } }));
		expect(res.status).toBe(400);
	});

	it('devuelve 409 si el dominio ya existe en el proyecto', async () => {
		const sb = makeSupabase({ project: { id: 'p1', name: 'Test' }, existing: { id: 'dom-old' } });
		const res = await POST(makeEvent({ supabase: sb, method: 'POST', body: { domain: 'existente.com' } }));
		expect(res.status).toBe(409);
	});

	it('devuelve 500 si falla la inserción en DB', async () => {
		const sb = makeSupabase({ project: { id: 'p1', name: 'Test' }, existing: null, insertError: true });
		const res = await POST(makeEvent({ supabase: sb, method: 'POST', body: { domain: 'nuevo.com' } }));
		expect(res.status).toBe(500);
	});

	it('devuelve 201 con domainId al crear correctamente', async () => {
		const sb = makeSupabase({ project: { id: 'p1', name: 'Test' }, existing: null, inserted: { id: 'dom-new' } });
		const res = await POST(makeEvent({ supabase: sb, method: 'POST', body: { domain: 'nuevo.com' } }));
		expect(res.status).toBe(201);
		const body = await res.json() as { ok: boolean; domainId: string };
		expect(body.ok).toBe(true);
		expect(body.domainId).toBe('dom-new');
	});

	it('llama a startDomainSetup con los parámetros correctos', async () => {
		const sb = makeSupabase({ project: { id: 'proj-1', name: 'Mi Proyecto' }, existing: null, inserted: { id: 'dom-new' } });
		await POST(makeEvent({ supabase: sb, projectId: 'proj-1', method: 'POST', body: { domain: 'nuevo.com' } }));

		expect(mockStartDomainSetup.mock.calls.length).toBe(1);
		const params = (mockStartDomainSetup.mock.calls as unknown as [[Record<string, unknown>]])[0][0];
		expect(params.domain).toBe('nuevo.com');
		expect(params.projectId).toBe('proj-1');
		expect(params.projectName).toBe('Mi Proyecto');
		expect(params.userId).toBe(AUTHENTICATED_USER.id);
		expect(params.domainId).toBe('dom-new');
	});

	it('no incluye mode en los parámetros de startDomainSetup', async () => {
		const sb = makeSupabase({ project: { id: 'p1', name: 'T' }, existing: null, inserted: { id: 'd1' } });
		await POST(makeEvent({ supabase: sb, method: 'POST', body: { domain: 'nuevo.com' } }));

		const params = (mockStartDomainSetup.mock.calls as unknown as [[Record<string, unknown>]])[0][0];
		expect(params.mode).toBeUndefined();
	});

	it('normaliza el dominio a minúsculas', async () => {
		const sb = makeSupabase({ project: { id: 'p1', name: 'T' }, existing: null, inserted: { id: 'd1' } });
		await POST(makeEvent({ supabase: sb, method: 'POST', body: { domain: 'MAYUSCULAS.COM' } }));

		const params = (mockStartDomainSetup.mock.calls as unknown as [[Record<string, unknown>]])[0][0];
		expect(params.domain).toBe('mayusculas.com');
	});

	it('pasa existingZoneId cuando se envía en el body', async () => {
		const sb = makeSupabase({ project: { id: 'p1', name: 'T' }, existing: null, inserted: { id: 'd1' } });
		await POST(makeEvent({ supabase: sb, method: 'POST', body: { domain: 'ext.com', existingZoneId: 'zone-abc' } }));

		const params = (mockStartDomainSetup.mock.calls as unknown as [[Record<string, unknown>]])[0][0];
		expect(params.existingZoneId).toBe('zone-abc');
	});

	it('no bloquea la respuesta — 201 se devuelve antes de que setup termine', async () => {
		const sb = makeSupabase({ project: { id: 'p1', name: 'T' }, existing: null, inserted: { id: 'd1' } });
		const start = Date.now();
		const res = await POST(makeEvent({ supabase: sb, method: 'POST', body: { domain: 'fast.com' } }));
		expect(res.status).toBe(201);
		expect(Date.now() - start).toBeLessThan(500);
	});
});

// ── DELETE ────────────────────────────────────────────────────────────────────

describe('DELETE — desconectar dominio', () => {
	it('devuelve 401 si no autenticado', async () => {
		const res = await DELETE(makeEvent({ user: null, method: 'DELETE', body: { domainId: 'dom-1' } }));
		expect(res.status).toBe(401);
	});

	it('devuelve 400 si el body JSON es inválido', async () => {
		const event = makeEvent({ method: 'DELETE' });
		(event as never as { request: Request }).request = new Request('http://localhost/', {
			method:  'DELETE',
			body:    'no es json',
			headers: { 'Content-Type': 'application/json' },
		});
		const res = await DELETE(event);
		expect(res.status).toBe(400);
	});

	it('devuelve 400 si domainId está vacío', async () => {
		const res = await DELETE(makeEvent({ method: 'DELETE', body: { domainId: '' } }));
		expect(res.status).toBe(400);
	});

	it('devuelve 400 si domainId no está presente', async () => {
		const res = await DELETE(makeEvent({ method: 'DELETE', body: {} }));
		expect(res.status).toBe(400);
	});

	it('devuelve 404 si el dominio no existe o no pertenece al proyecto', async () => {
		const sb = makeSupabase({ foundDomain: null });
		const res = await DELETE(makeEvent({ supabase: sb, method: 'DELETE', body: { domainId: 'no-existe' } }));
		expect(res.status).toBe(404);
	});

	it('devuelve 200 y llama a disconnectDomain con los parámetros correctos', async () => {
		const sb = makeSupabase({ foundDomain: { id: 'dom-1', domain: 'bye.com' } });
		const res = await DELETE(makeEvent({ supabase: sb, projectId: 'proj-1', method: 'DELETE', body: { domainId: 'dom-1' } }));

		expect(res.status).toBe(200);
		const body = await res.json() as { ok: boolean };
		expect(body.ok).toBe(true);

		expect(mockDisconnectDomain.mock.calls.length).toBe(1);
		const [domainId, domain, projectId, userId, actor] = mockDisconnectDomain.mock.calls[0] as string[];
		expect(domainId).toBe('dom-1');
		expect(domain).toBe('bye.com');
		expect(projectId).toBe('proj-1');
		expect(userId).toBe(AUTHENTICATED_USER.id);
		expect(actor).toBe(AUTHENTICATED_USER.email);
	});
});

// ── fallback ──────────────────────────────────────────────────────────────────

describe('fallback — métodos no permitidos', () => {
	it('devuelve 405 para PATCH', async () => {
		const res = await fallback(makeEvent({ method: 'PATCH' }));
		expect(res.status).toBe(405);
	});

	it('devuelve 405 para PUT', async () => {
		const res = await fallback(makeEvent({ method: 'PUT' }));
		expect(res.status).toBe(405);
	});
});
