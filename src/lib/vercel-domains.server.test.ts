import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test';

mock.module('$env/static/private', () => ({
	CLOUDFLARE_API_TOKEN:  'test-cf-token',
	CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
	VERCEL_API_TOKEN:      'test-vercel-token',
	VERCEL_PROJECT_ID:     'test-project-id',
	RESEND_API_KEY:        'test-resend-key',
	RESEND_FROM_EMAIL:     'noreply@test.com',
	ALERT_EMAIL:           'alertas@test.com',
}));

const {
	addDomainToProject,
	getDomainInfo,
	removeDomainFromProject,
} = await import('./vercel-domains.server');

// ── Helpers ───────────────────────────────────────────────────────────────────

function vercelOk<T>(body: T, status = 200) {
	return new Response(JSON.stringify(body), { status });
}

function vercelDomainPayload(domain: string, verified = false) {
	return {
		name:         domain,
		apexName:     domain.replace(/^www\./, ''),
		verified,
		verification: [],
	};
}

// ── addDomainToProject ────────────────────────────────────────────────────────

describe('addDomainToProject', () => {
	let fetchSpy: ReturnType<typeof spyOn>;
	beforeEach(() => { fetchSpy = spyOn(globalThis, 'fetch'); });
	afterEach(()  => { fetchSpy.mockRestore(); });

	it('happy path: apex y www añadidos — devuelve resultado del apex', async () => {
		fetchSpy
			.mockResolvedValueOnce(vercelOk(vercelDomainPayload('cliente.com')) as never)
			.mockResolvedValueOnce(vercelOk(vercelDomainPayload('www.cliente.com')) as never);

		const result = await addDomainToProject('cliente.com');
		expect(result.name).toBe('cliente.com');
		expect(result.cnamTarget).toBe('cname.vercel-dns.com');
	});

	it('cnamTarget es siempre "cname.vercel-dns.com" independientemente de la respuesta', async () => {
		fetchSpy
			.mockResolvedValueOnce(vercelOk({ ...vercelDomainPayload('x.com') }) as never)
			.mockResolvedValueOnce(vercelOk(vercelDomainPayload('www.x.com')) as never);

		const result = await addDomainToProject('x.com');
		expect(result.cnamTarget).toBe('cname.vercel-dns.com');
	});

	it('lanza dos peticiones (apex + www) en la misma llamada', async () => {
		fetchSpy
			.mockResolvedValueOnce(vercelOk(vercelDomainPayload('a.com')) as never)
			.mockResolvedValueOnce(vercelOk(vercelDomainPayload('www.a.com')) as never);

		await addDomainToProject('a.com');
		expect(fetchSpy.mock.calls.length).toBe(2);

		const urls = fetchSpy.mock.calls.map(([url]: [string]) => url);
		const hasApex = urls.some((u: string) => u.includes('/domains') && !u.includes('www.a.com'));
		const hasWww  = urls.some((u: string) => u.includes('www.a.com'));
		// Ambos endpoints son POST /v10/projects/{id}/domains con body diferente
		expect((fetchSpy.mock.calls[0] as [string, RequestInit])[1].body).toContain('"a.com"');
	});

	it('NO lanza si www falla con error 500 (fallo no-fatal) — bug original con Promise.all', async () => {
		// Apex OK, www falla
		fetchSpy
			.mockResolvedValueOnce(vercelOk(vercelDomainPayload('b.com')) as never)
			.mockResolvedValueOnce(vercelOk({ error: { message: 'Internal error' } }, 500) as never);

		// Con el fix (allSettled), esto debe resolver correctamente en lugar de lanzar
		const result = await addDomainToProject('b.com');
		expect(result.name).toBe('b.com');
	});

	it('SÍ lanza si apex falla (fallo fatal)', async () => {
		fetchSpy
			.mockResolvedValueOnce(vercelOk({ error: { message: 'Unauthorized' } }, 403) as never)
			.mockResolvedValueOnce(vercelOk(vercelDomainPayload('www.c.com')) as never);

		await expect(addDomainToProject('c.com')).rejects.toThrow();
	});

	it('409 (dominio ya registrado) en apex NO lanza — es idempotente', async () => {
		const body409 = { ...vercelDomainPayload('d.com'), error: { message: 'Already exists' } };
		fetchSpy
			.mockResolvedValueOnce(vercelOk(body409, 409) as never)
			.mockResolvedValueOnce(vercelOk(vercelDomainPayload('www.d.com')) as never);

		// 409 debe tratarse como éxito (devuelve el json sin lanzar)
		const result = await addDomainToProject('d.com');
		expect(result).toBeTruthy();
	});

	it('incluye el dominio en el body de la petición a Vercel', async () => {
		fetchSpy
			.mockResolvedValueOnce(vercelOk(vercelDomainPayload('test.io')) as never)
			.mockResolvedValueOnce(vercelOk(vercelDomainPayload('www.test.io')) as never);

		await addDomainToProject('test.io');
		// Primera llamada debe incluir el apex en el body
		const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
		expect(body.name).toBe('test.io');
	});

	it('incluye Authorization Bearer correcto en cada petición', async () => {
		fetchSpy
			.mockResolvedValueOnce(vercelOk(vercelDomainPayload('h.com')) as never)
			.mockResolvedValueOnce(vercelOk(vercelDomainPayload('www.h.com')) as never);

		await addDomainToProject('h.com');
		for (const [, init] of fetchSpy.mock.calls as [string, RequestInit][]) {
			expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-vercel-token');
		}
	});

	it('usa el VERCEL_PROJECT_ID en la URL', async () => {
		fetchSpy
			.mockResolvedValueOnce(vercelOk(vercelDomainPayload('p.com')) as never)
			.mockResolvedValueOnce(vercelOk(vercelDomainPayload('www.p.com')) as never);

		await addDomainToProject('p.com');
		const [url] = fetchSpy.mock.calls[0] as [string];
		expect(url).toContain('test-project-id');
	});
});

// ── getDomainInfo ─────────────────────────────────────────────────────────────

describe('getDomainInfo', () => {
	let fetchSpy: ReturnType<typeof spyOn>;
	beforeEach(() => { fetchSpy = spyOn(globalThis, 'fetch'); });
	afterEach(()  => { fetchSpy.mockRestore(); });

	it('devuelve info del dominio correctamente', async () => {
		fetchSpy.mockResolvedValueOnce(vercelOk(vercelDomainPayload('mis.com', true)) as never);
		const info = await getDomainInfo('mis.com');
		expect(info.name).toBe('mis.com');
		expect(info.verified).toBe(true);
		expect(info.cnamTarget).toBe('cname.vercel-dns.com');
	});

	it('llama al endpoint GET correcto con el dominio en la URL', async () => {
		fetchSpy.mockResolvedValueOnce(vercelOk(vercelDomainPayload('q.com')) as never);
		await getDomainInfo('q.com');
		const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('/domains/q.com');
		expect((init as RequestInit).method).toBeUndefined(); // GET implícito
	});

	it('devuelve verified=false si el dominio no está verificado', async () => {
		fetchSpy.mockResolvedValueOnce(vercelOk(vercelDomainPayload('unverified.com', false)) as never);
		const info = await getDomainInfo('unverified.com');
		expect(info.verified).toBe(false);
	});

	it('lanza si Vercel responde error (dominio no registrado)', async () => {
		fetchSpy.mockResolvedValueOnce(vercelOk({ error: 'Not found' }, 404) as never);
		await expect(getDomainInfo('noexiste.com')).rejects.toThrow('getDomainInfo');
	});

	it('devuelve array vacío de verification si el campo no viene en la respuesta', async () => {
		fetchSpy.mockResolvedValueOnce(vercelOk({ name: 'r.com', verified: false }) as never);
		const info = await getDomainInfo('r.com');
		expect(info.verification).toEqual([]);
	});
});

// ── removeDomainFromProject ───────────────────────────────────────────────────

describe('removeDomainFromProject', () => {
	let fetchSpy: ReturnType<typeof spyOn>;
	beforeEach(() => { fetchSpy = spyOn(globalThis, 'fetch'); });
	afterEach(()  => { fetchSpy.mockRestore(); });

	it('elimina apex y www con dos llamadas DELETE', async () => {
		fetchSpy
			.mockResolvedValueOnce(vercelOk({}, 200) as never)
			.mockResolvedValueOnce(vercelOk({}, 200) as never);

		await removeDomainFromProject('bye.com');
		expect(fetchSpy.mock.calls.length).toBe(2);

		const methods = fetchSpy.mock.calls.map(([, init]: [string, RequestInit]) => init.method);
		expect(methods.every((m: string | undefined) => m === 'DELETE')).toBe(true);
	});

	it('404 en apex no lanza (dominio ya no registrado — idempotente)', async () => {
		fetchSpy
			.mockResolvedValueOnce(vercelOk({}, 404) as never)
			.mockResolvedValueOnce(vercelOk({}, 200) as never);

		await expect(removeDomainFromProject('gone.com')).resolves.toBeUndefined();
	});

	it('404 en www no lanza (idempotente)', async () => {
		fetchSpy
			.mockResolvedValueOnce(vercelOk({}, 200) as never)
			.mockResolvedValueOnce(vercelOk({}, 404) as never);

		await expect(removeDomainFromProject('gone2.com')).resolves.toBeUndefined();
	});

	it('ambos 404 no lanza', async () => {
		fetchSpy
			.mockResolvedValueOnce(vercelOk({}, 404) as never)
			.mockResolvedValueOnce(vercelOk({}, 404) as never);

		await expect(removeDomainFromProject('doble-gone.com')).resolves.toBeUndefined();
	});

	it('error en uno de los dominios no impide eliminar el otro (allSettled)', async () => {
		// Apex falla con 500, www tiene éxito
		fetchSpy
			.mockResolvedValueOnce(vercelOk({ error: 'Server error' }, 500) as never)
			.mockResolvedValueOnce(vercelOk({}, 200) as never);

		// Debería resolver sin lanzar porque allSettled absorbe fallos individuales
		await expect(removeDomainFromProject('partial.com')).resolves.toBeUndefined();
	});

	it('incluye el dominio y www en las URLs de DELETE', async () => {
		fetchSpy
			.mockResolvedValueOnce(vercelOk({}, 200) as never)
			.mockResolvedValueOnce(vercelOk({}, 200) as never);

		await removeDomainFromProject('check-url.com');
		const urls = fetchSpy.mock.calls.map(([url]: [string]) => url);
		expect(urls.some((u: string) => u.includes('check-url.com'))).toBe(true);
		expect(urls.some((u: string) => u.includes('www.check-url.com'))).toBe(true);
	});
});
