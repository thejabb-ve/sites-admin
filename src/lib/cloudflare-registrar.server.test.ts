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
	checkAvailability,
	purchaseDomain,
	getZoneByName,
	pollZoneReady,
	createZone,
	addDnsRecord,
	createCacheRule,
	createApexRedirectRule,
} = await import('./cloudflare-registrar.server');

// ── Helpers ───────────────────────────────────────────────────────────────────

function cfOk<T>(result: T) {
	return new Response(JSON.stringify({ success: true, result, errors: [] }), { status: 200 });
}
function cfFail(message: string) {
	return new Response(JSON.stringify({ success: false, result: null, errors: [{ message }] }), { status: 200 });
}

function rdapOk()  { return new Response('{}', { status: 200 }); }
function rdapNone() { return new Response('Not found', { status: 404 }); }

// ── checkAvailability ─────────────────────────────────────────────────────────

describe('checkAvailability', () => {
	let fetchSpy: ReturnType<typeof spyOn>;
	beforeEach(() => { fetchSpy = spyOn(globalThis, 'fetch'); });
	afterEach(()  => { fetchSpy.mockRestore(); });

	it('devuelve available=false para un dominio registrado (amazon.com)', async () => {
		fetchSpy.mockResolvedValueOnce(rdapOk() as never);
		const r = await checkAvailability('amazon.com');
		expect(r.available).toBe(false);
	});

	it('devuelve available=true cuando RDAP responde 404 (dominio libre)', async () => {
		fetchSpy.mockResolvedValueOnce(rdapNone() as never);
		const r = await checkAvailability('libre-xkcd-123.com');
		expect(r.available).toBe(true);
	});

	it('lanza error si RDAP responde un status inesperado (5xx)', async () => {
		fetchSpy.mockResolvedValueOnce(new Response('Error', { status: 500 }) as never);
		await expect(checkAvailability('x.com')).rejects.toThrow('HTTP 500');
	});

	it('lanza error si fetch falla por red', async () => {
		fetchSpy.mockRejectedValueOnce(new Error('network') as never);
		await expect(checkAvailability('x.com')).rejects.toThrow();
	});

	it('consulta rdap.org (no CF RDAP) con el dominio correcto', async () => {
		fetchSpy.mockResolvedValueOnce(rdapNone() as never);
		await checkAvailability('midominio.es');
		const [url] = fetchSpy.mock.calls[0] as [string];
		expect(url).toContain('rdap.org/domain/midominio.es');
		expect(url).not.toContain('cloudflare.com');
	});

	it('incluye Accept: application/rdap+json en la petición', async () => {
		fetchSpy.mockResolvedValueOnce(rdapNone() as never);
		await checkAvailability('test.io');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect((init.headers as Record<string, string>)['Accept']).toBe('application/rdap+json');
	});

	it('lanza error si RDAP responde 503', async () => {
		fetchSpy.mockResolvedValueOnce(new Response('Service unavailable', { status: 503 }) as never);
		await expect(checkAvailability('caido.com')).rejects.toThrow('HTTP 503');
	});
});

// ── purchaseDomain ────────────────────────────────────────────────────────────

describe('purchaseDomain', () => {
	let fetchSpy: ReturnType<typeof spyOn>;
	beforeEach(() => { fetchSpy = spyOn(globalThis, 'fetch'); });
	afterEach(()  => { fetchSpy.mockRestore(); });

	it('llama al endpoint correcto de CF Registrar', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({}) as never);
		await purchaseDomain('nuevo.com');
		const [url] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('/accounts/test-account-id/registrar/domains/nuevo.com/registration');
	});

	it('envía Authorization Bearer correcto', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({}) as never);
		await purchaseDomain('nuevo.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer test-cf-token');
	});

	it('usa método POST', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({}) as never);
		await purchaseDomain('nuevo.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(init.method).toBe('POST');
	});

	it('envía auto_renew=true, years=1, privacy=true en el cuerpo', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({}) as never);
		await purchaseDomain('nuevo.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(init.body as string);
		expect(body.auto_renew).toBe(true);
		expect(body.years).toBe(1);
		expect(body.privacy).toBe(true);
	});

	it('envía AGENCY_CONTACT con datos de la agencia (no del cliente)', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({}) as never);
		await purchaseDomain('nuevo.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const { registrant_contact } = JSON.parse(init.body as string);
		expect(registrant_contact.email).toBe('agencia.jabb@gmail.com');
		expect(registrant_contact.first_name).toBe('Agencia');
		expect(registrant_contact.last_name).toBe('Jabb');
		expect(registrant_contact.phone).toBe('+584126043368');
		expect(registrant_contact.address.country).toBe('VE');
	});

	it('lanza error si CF responde success=false', async () => {
		fetchSpy.mockResolvedValueOnce(cfFail('Domain unavailable') as never);
		await expect(purchaseDomain('x.com')).rejects.toThrow('CF Registrar error');
	});

	it('el mensaje de error incluye el mensaje de CF', async () => {
		fetchSpy.mockResolvedValueOnce(cfFail('Insufficient funds') as never);
		await expect(purchaseDomain('x.com')).rejects.toThrow('Insufficient funds');
	});
});

// ── getZoneByName ─────────────────────────────────────────────────────────────

describe('getZoneByName', () => {
	let fetchSpy: ReturnType<typeof spyOn>;
	beforeEach(() => { fetchSpy = spyOn(globalThis, 'fetch'); });
	afterEach(()  => { fetchSpy.mockRestore(); });

	it('devuelve la zona cuando CF la encuentra', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk([{ id: 'zone-1', name: 'dominio.com', status: 'active' }]) as never);
		const zone = await getZoneByName('dominio.com');
		expect(zone?.id).toBe('zone-1');
		expect(zone?.name).toBe('dominio.com');
	});

	it('devuelve null si no hay resultados', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk([]) as never);
		const zone = await getZoneByName('nuevo.com');
		expect(zone).toBeNull();
	});

	it('devuelve null si success=false', async () => {
		fetchSpy.mockResolvedValueOnce(
			new Response(JSON.stringify({ success: false, result: [] }), { status: 200 }) as never,
		);
		const zone = await getZoneByName('fallo.com');
		expect(zone).toBeNull();
	});

	it('incluye el nombre de dominio como query param en la URL', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk([]) as never);
		await getZoneByName('ejemplo.com');
		const [url] = fetchSpy.mock.calls[0] as [string];
		expect(url).toContain('name=ejemplo.com');
	});

	it('consulta el endpoint /zones', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk([]) as never);
		await getZoneByName('ejemplo.com');
		const [url] = fetchSpy.mock.calls[0] as [string];
		expect(url).toContain('/zones');
	});
});

// ── pollZoneReady ─────────────────────────────────────────────────────────────

describe('pollZoneReady', () => {
	let fetchSpy: ReturnType<typeof spyOn>;
	beforeEach(() => { fetchSpy = spyOn(globalThis, 'fetch'); });
	afterEach(()  => { fetchSpy.mockRestore(); });

	it('devuelve la zona cuando está activa desde el primer intento', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk([{ id: 'z-1', name: 'd.com', status: 'active' }]) as never);
		const zone = await pollZoneReady('d.com', 10_000, 10);
		expect(zone.id).toBe('z-1');
	});

	it('reintenta si la zona está en estado pendiente y la devuelve al activarse', async () => {
		// Primer intento: zona pending (no activa)
		fetchSpy
			.mockResolvedValueOnce(cfOk([{ id: 'z-1', name: 'd.com', status: 'pending' }]) as never)
			// Segundo intento: zona activa
			.mockResolvedValueOnce(cfOk([{ id: 'z-1', name: 'd.com', status: 'active' }]) as never);

		const zone = await pollZoneReady('d.com', 5_000, 10);
		expect(zone.id).toBe('z-1');
		expect(fetchSpy.mock.calls.length).toBe(2);
	});

	it('reintenta si la zona no existe aún y la encuentra después', async () => {
		fetchSpy
			.mockResolvedValueOnce(cfOk([]) as never)
			.mockResolvedValueOnce(cfOk([{ id: 'z-2', name: 'e.com', status: 'active' }]) as never);

		const zone = await pollZoneReady('e.com', 5_000, 10);
		expect(zone.id).toBe('z-2');
	});

	it('lanza error si se agota el timeout', async () => {
		// Cada llamada a fetch necesita una Response nueva (el body solo puede leerse una vez)
		fetchSpy.mockImplementation(async () => cfOk([]) as never);
		await expect(pollZoneReady('d.com', 100, 10)).rejects.toThrow('Tiempo de espera agotado');
	});

	it('el mensaje de timeout menciona el dominio y los segundos esperados', async () => {
		fetchSpy.mockImplementation(async () => cfOk([]) as never);
		await expect(pollZoneReady('timeout.com', 50, 10)).rejects.toThrow('timeout.com');
	});
});

// ── createZone ────────────────────────────────────────────────────────────────

describe('createZone', () => {
	let fetchSpy: ReturnType<typeof spyOn>;
	beforeEach(() => { fetchSpy = spyOn(globalThis, 'fetch'); });
	afterEach(()  => { fetchSpy.mockRestore(); });

	it('devuelve la zona creada', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'z-new', name: 'cliente.com', status: 'active' }) as never);
		const zone = await createZone('cliente.com');
		expect(zone.id).toBe('z-new');
	});

	it('llama a POST /zones', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'z', name: 'x.com', status: 'active' }) as never);
		await createZone('x.com');
		const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(url).toContain('/zones');
		expect(init.method).toBe('POST');
	});

	it('envía name correcto en el body', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'z', name: 'cliente.com', status: 'active' }) as never);
		await createZone('cliente.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(init.body as string)).toMatchObject({ name: 'cliente.com' });
	});

	it('envía jump_start=false y type=full', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'z', name: 'x.com', status: 'active' }) as never);
		await createZone('x.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(init.body as string);
		expect(body.jump_start).toBe(false);
		expect(body.type).toBe('full');
	});

	it('incluye el account.id correcto', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'z', name: 'x.com', status: 'active' }) as never);
		await createZone('x.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const body = JSON.parse(init.body as string);
		expect(body.account.id).toBe('test-account-id');
	});

	it('lanza error si CF falla', async () => {
		fetchSpy.mockResolvedValueOnce(cfFail('Invalid domain') as never);
		await expect(createZone('bad')).rejects.toThrow('CF createZone error');
	});
});

// ── addDnsRecord ──────────────────────────────────────────────────────────────

describe('addDnsRecord', () => {
	let fetchSpy: ReturnType<typeof spyOn>;
	beforeEach(() => { fetchSpy = spyOn(globalThis, 'fetch'); });
	afterEach(()  => { fetchSpy.mockRestore(); });

	it('crea un registro CNAME y devuelve el resultado', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'rec-1', type: 'CNAME', name: 'www', content: 'cname.vercel-dns.com' }) as never);
		const rec = await addDnsRecord('zone-1', 'CNAME', 'www', 'cname.vercel-dns.com');
		expect(rec.id).toBe('rec-1');
		expect(rec.type).toBe('CNAME');
	});

	it('crea un registro A', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'rec-2', type: 'A', name: '@', content: '76.76.21.21' }) as never);
		const rec = await addDnsRecord('zone-1', 'A', '@', '76.76.21.21');
		expect(rec.type).toBe('A');
	});

	it('envía type, name, content correctamente', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r', type: 'CNAME', name: 'www', content: 'target.com' }) as never);
		await addDnsRecord('zone-1', 'CNAME', 'www', 'target.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(init.body as string)).toMatchObject({ type: 'CNAME', name: 'www', content: 'target.com' });
	});

	it('envía proxied=true por defecto (protección CF activa)', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r', type: 'A', name: '@', content: '1.1.1.1' }) as never);
		await addDnsRecord('zone-1', 'A', '@', '1.1.1.1');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(init.body as string).proxied).toBe(true);
	});

	it('permite proxied=false cuando se especifica explícitamente', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r', type: 'TXT', name: '@', content: 'v=spf1' }) as never);
		await addDnsRecord('zone-1', 'TXT', '@', 'v=spf1', false);
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(init.body as string).proxied).toBe(false);
	});

	it('envía ttl=1 (automático en CF)', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r', type: 'CNAME', name: 'www', content: 'x' }) as never);
		await addDnsRecord('zone-1', 'CNAME', 'www', 'x');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(JSON.parse(init.body as string).ttl).toBe(1);
	});

	it('llama al endpoint correcto con el zoneId dado', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r', type: 'A', name: '@', content: '1.1.1.1' }) as never);
		await addDnsRecord('my-zone-id', 'A', '@', '1.1.1.1');
		const [url] = fetchSpy.mock.calls[0] as [string];
		expect(url).toContain('/zones/my-zone-id/dns_records');
	});

	it('lanza error si CF falla', async () => {
		fetchSpy.mockResolvedValueOnce(cfFail('Record already exists') as never);
		await expect(addDnsRecord('z-1', 'CNAME', 'www', 'x')).rejects.toThrow('CF DNS error');
	});

	it('el mensaje de error incluye el tipo y nombre del registro', async () => {
		fetchSpy.mockResolvedValueOnce(cfFail('Duplicate') as never);
		await expect(addDnsRecord('z-1', 'CNAME', 'www', 'x')).rejects.toThrow('CNAME www');
	});
});

// ── createCacheRule ───────────────────────────────────────────────────────────

describe('createCacheRule', () => {
	let fetchSpy: ReturnType<typeof spyOn>;
	beforeEach(() => { fetchSpy = spyOn(globalThis, 'fetch'); });
	afterEach(()  => { fetchSpy.mockRestore(); });

	it('llama al endpoint de cache settings y devuelve el id', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'rule-cache-1' }) as never);
		const id = await createCacheRule('zone-1', 'cliente.com');
		expect(id).toBe('rule-cache-1');
		const [url] = fetchSpy.mock.calls[0] as [string];
		expect(url).toContain('http_request_cache_settings');
	});

	it('usa método PUT', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r' }) as never);
		await createCacheRule('zone-1', 'x.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(init.method).toBe('PUT');
	});

	it('configura edge_ttl=2592000 (30 días, alineado con s-maxage de [...slug].astro)', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r' }) as never);
		await createCacheRule('zone-1', 'cliente.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const rule = JSON.parse(init.body as string).rules[0];
		expect(rule.action_parameters.edge_ttl.default).toBe(2592000);
		expect(rule.action_parameters.edge_ttl.mode).toBe('override_origin');
	});

	it('configura browser_ttl=respect_origin (respeta max-age=0 del header, no cachea en browser)', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r' }) as never);
		await createCacheRule('zone-1', 'cliente.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const rule = JSON.parse(init.body as string).rules[0];
		expect(rule.action_parameters.browser_ttl.mode).toBe('respect_origin');
	});

	it('la expresión de la regla incluye tanto www como el apex', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r' }) as never);
		await createCacheRule('zone-1', 'cliente.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const rule = JSON.parse(init.body as string).rules[0];
		expect(rule.expression).toContain('www.cliente.com');
		expect(rule.expression).toContain('cliente.com');
	});

	it('la expresión no incluye un dominio diferente al dado', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r' }) as never);
		await createCacheRule('zone-1', 'midominio.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const rule = JSON.parse(init.body as string).rules[0];
		// Verifica que la regla aplica al dominio correcto y no a otro
		expect(rule.expression).not.toContain('cliente.com');
		expect(rule.expression).toContain('midominio.com');
	});

	it('lanza error si CF falla', async () => {
		fetchSpy.mockResolvedValueOnce(cfFail('Permission denied') as never);
		await expect(createCacheRule('z-1', 'x.com')).rejects.toThrow('CF CacheRule error');
	});
});

// ── createApexRedirectRule ────────────────────────────────────────────────────

describe('createApexRedirectRule', () => {
	let fetchSpy: ReturnType<typeof spyOn>;
	beforeEach(() => { fetchSpy = spyOn(globalThis, 'fetch'); });
	afterEach(()  => { fetchSpy.mockRestore(); });

	it('llama al endpoint de redirect y devuelve el id', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'rule-redir-1' }) as never);
		const id = await createApexRedirectRule('zone-1', 'cliente.com');
		expect(id).toBe('rule-redir-1');
		const [url] = fetchSpy.mock.calls[0] as [string];
		expect(url).toContain('http_request_dynamic_redirect');
	});

	it('usa método PUT', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r' }) as never);
		await createApexRedirectRule('zone-1', 'x.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		expect(init.method).toBe('PUT');
	});

	it('la expresión de la regla aplica solo al apex (sin www)', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r' }) as never);
		await createApexRedirectRule('zone-1', 'cliente.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const rule = JSON.parse(init.body as string).rules[0];
		expect(rule.expression).toContain('cliente.com');
		expect(rule.expression).not.toContain('www.cliente.com');
	});

	it('redirige a https://www.{dominio} preservando el path (concat)', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r' }) as never);
		await createApexRedirectRule('zone-1', 'cliente.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const rule = JSON.parse(init.body as string).rules[0];
		const target = rule.action_parameters.from_value.target_url.expression;
		expect(target).toContain('https://www.cliente.com');
		expect(target).toContain('http.request.uri.path');
	});

	it('usa status_code=301 (redirect permanente)', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r' }) as never);
		await createApexRedirectRule('zone-1', 'cliente.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const rule = JSON.parse(init.body as string).rules[0];
		expect(rule.action_parameters.from_value.status_code).toBe(301);
	});

	it('preserva query string en el redirect', async () => {
		fetchSpy.mockResolvedValueOnce(cfOk({ id: 'r' }) as never);
		await createApexRedirectRule('zone-1', 'cliente.com');
		const [, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
		const rule = JSON.parse(init.body as string).rules[0];
		expect(rule.action_parameters.from_value.preserve_query_string).toBe(true);
	});

	it('lanza error si CF falla', async () => {
		fetchSpy.mockResolvedValueOnce(cfFail('Permission denied') as never);
		await expect(createApexRedirectRule('z-1', 'x.com')).rejects.toThrow('CF RedirectRule error');
	});
});
