import { describe, it, expect, beforeEach, afterEach, spyOn, mock } from 'bun:test';

// ── Mocks de módulos que ningún otro test file prueba ─────────────────────────

let _pendingSetup: Promise<void> | null = null;
mock.module('@vercel/functions', () => ({
	waitUntil: (p: Promise<void>) => { _pendingSetup = p; },
}));

mock.module('$env/static/private', () => ({
	CLOUDFLARE_API_TOKEN:  'test-cf-token',
	CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
	VERCEL_API_TOKEN:      'test-vercel-token',
	VERCEL_PROJECT_ID:     'test-project-id',
	RESEND_API_KEY:        'test-resend-key',
	RESEND_FROM_EMAIL:     'noreply@test.com',
	ALERT_EMAIL:           'alertas@test.com',
}));

mock.module('resend', () => ({
	Resend: class { emails = { send: mock(async () => ({ data: { id: '1' }, error: null })) }; },
}));

// ── Imports (live bindings ESM para que spyOn funcione) ───────────────────────

const cfLib      = await import('./cloudflare-registrar.server');
const vercelLib  = await import('./vercel-domains.server');
const emailLib   = await import('./email.server');
const auditLib   = await import('./audit');
const { startDomainSetup, disconnectDomain } = await import('./domain-setup.server');

// ── Spies ─────────────────────────────────────────────────────────────────────

let spyGetZoneByName:           ReturnType<typeof spyOn>;
let spyAddDnsRecord:            ReturnType<typeof spyOn>;
let spyCreateCacheRule:         ReturnType<typeof spyOn>;
let spyCreateApexRedirectRule:  ReturnType<typeof spyOn>;
let spyAddDomainToProject:      ReturnType<typeof spyOn>;
let spyRemoveDomainFromProject: ReturnType<typeof spyOn>;
let spySendEmail:               ReturnType<typeof spyOn>;
let spyLogAudit:                ReturnType<typeof spyOn>;

const ACTIVE_ZONE = { id: 'zone-cf-1', name: 'test.com', status: 'active' };

beforeEach(() => {
	_pendingSetup = null;

	spyGetZoneByName          = spyOn(cfLib, 'getZoneByName').mockImplementation(async () => ACTIVE_ZONE);
	spyAddDnsRecord           = spyOn(cfLib, 'addDnsRecord').mockImplementation(async () => ({ id: 'rec-1', type: 'CNAME', name: 'www', content: 'cname.vercel-dns.com' }));
	spyCreateCacheRule        = spyOn(cfLib, 'createCacheRule').mockImplementation(async () => 'cache-rule-id');
	spyCreateApexRedirectRule = spyOn(cfLib, 'createApexRedirectRule').mockImplementation(async () => 'redirect-rule-id');

	spyAddDomainToProject     = spyOn(vercelLib, 'addDomainToProject').mockImplementation(async () => ({
		name: 'test.com', apexName: 'test.com', verified: false,
		cnamTarget: 'cname.vercel-dns.com', verification: [],
	}));
	spyRemoveDomainFromProject = spyOn(vercelLib, 'removeDomainFromProject').mockImplementation(async () => undefined);

	spySendEmail = spyOn(emailLib, 'sendEmail').mockImplementation(async () => undefined);
	spyLogAudit  = spyOn(auditLib, 'logAudit').mockImplementation(async () => undefined);
});

afterEach(() => {
	spyGetZoneByName.mockRestore();
	spyAddDnsRecord.mockRestore();
	spyCreateCacheRule.mockRestore();
	spyCreateApexRedirectRule.mockRestore();
	spyAddDomainToProject.mockRestore();
	spyRemoveDomainFromProject.mockRestore();
	spySendEmail.mockRestore();
	spyLogAudit.mockRestore();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSupabase() {
	const eqFn     = mock(async () => ({ error: null }));
	const updateFn = mock(() => ({ eq: eqFn }));
	const fromFn   = mock(() => ({ update: updateFn }));
	return { from: fromFn, _update: updateFn, _eq: eqFn };
}

const BASE = {
	domainId:    'dom-uuid-1',
	domain:      'test.com',
	projectId:   'proj-uuid-1',
	projectName: 'Proyecto Test',
	userId:      'user-uuid-1',
	actor:       'usuario@test.com',
};

async function runSetup(
	overrides: Partial<typeof BASE & { existingZoneId?: string }> = {},
	supabase?: ReturnType<typeof makeSupabase>,
) {
	const sb = supabase ?? makeSupabase();
	startDomainSetup({ ...BASE, ...overrides }, sb as never);
	await _pendingSetup!;
	return sb;
}

// ── startDomainSetup — happy path ─────────────────────────────────────────────

describe('startDomainSetup — happy path (zona encontrada en CF)', () => {
	it('marca el dominio como configuring al inicio', async () => {
		const sb = await runSetup();
		const firstUpdate = (sb._update as ReturnType<typeof mock>).mock.calls[0][0] as Record<string, unknown>;
		expect(firstUpdate.status).toBe('configuring');
	});

	it('busca la zona CF por nombre de dominio', async () => {
		await runSetup({ domain: 'nuevo.com' });
		expect((spyGetZoneByName.mock.calls as unknown as [[string]])[0][0]).toBe('nuevo.com');
	});

	it('llama a addDomainToProject con el dominio', async () => {
		await runSetup();
		expect(spyAddDomainToProject.mock.calls[0][0]).toBe('test.com');
	});

	it('crea dos registros DNS (www y apex) usando el cname de Vercel', async () => {
		await runSetup();
		expect(spyAddDnsRecord.mock.calls.length).toBe(2);
		const contents = (spyAddDnsRecord.mock.calls as unknown as string[][]).map(c => c[3]);
		expect(contents.every((c: string) => c === 'cname.vercel-dns.com')).toBe(true);
	});

	it('llama a createCacheRule con el zoneId de CF', async () => {
		await runSetup();
		expect(spyCreateCacheRule.mock.calls[0][0]).toBe('zone-cf-1');
		expect(spyCreateCacheRule.mock.calls[0][1]).toBe('test.com');
	});

	it('llama a createApexRedirectRule con el zoneId de CF', async () => {
		await runSetup();
		expect(spyCreateApexRedirectRule.mock.calls[0][0]).toBe('zone-cf-1');
	});

	it('actualiza el dominio con status=active y los IDs de CF y Vercel', async () => {
		const sb = await runSetup();
		const updates = (sb._update as ReturnType<typeof mock>).mock.calls;
		const lastUpdate = updates[updates.length - 1][0] as Record<string, unknown>;
		expect(lastUpdate.status).toBe('active');
		expect(lastUpdate.cf_zone_id).toBe('zone-cf-1');
		expect(lastUpdate.cf_cache_rule_id).toBe('cache-rule-id');
		expect(lastUpdate.cf_redirect_rule_id).toBe('redirect-rule-id');
		expect(lastUpdate.vercel_domain_id).toBeTruthy();
		expect(lastUpdate.dns_verified_at).toBeTruthy();
	});

	it('registra un audit log con action=configure y status=ok', async () => {
		await runSetup();
		const auditCall = spyLogAudit.mock.calls[0][0] as Record<string, unknown>;
		expect(auditCall.action).toBe('configure');
		expect(auditCall.status).toBe('ok');
		expect(auditCall.resourceType).toBe('domain');
	});

	it('envía email de domain_configured al completar', async () => {
		await runSetup();
		const emailCall = spySendEmail.mock.calls[0][0] as { type: string; domain: string };
		expect(emailCall.type).toBe('domain_configured');
		expect(emailCall.domain).toBe('test.com');
	});
});

// ── startDomainSetup — con existingZoneId ─────────────────────────────────────

describe('startDomainSetup — existingZoneId presente', () => {
	it('NO llama a getZoneByName si se proporciona existingZoneId', async () => {
		await runSetup({ existingZoneId: 'zone-externo' });
		expect(spyGetZoneByName.mock.calls.length).toBe(0);
	});

	it('usa el existingZoneId en el DNS y las reglas CF', async () => {
		await runSetup({ existingZoneId: 'zone-externo' });
		expect(spyAddDnsRecord.mock.calls[0][0]).toBe('zone-externo');
		expect(spyCreateCacheRule.mock.calls[0][0]).toBe('zone-externo');
		expect(spyCreateApexRedirectRule.mock.calls[0][0]).toBe('zone-externo');
	});
});

// ── Fallo: zona CF no encontrada ─────────────────────────────────────────────

describe('startDomainSetup — zona CF no encontrada', () => {
	it('marca status=error con mensaje descriptivo si getZoneByName devuelve null', async () => {
		spyGetZoneByName.mockImplementation(async () => null);
		const sb = await runSetup();

		const errorUpdate = (sb._update as ReturnType<typeof mock>).mock.calls
			.find(c => (c[0] as Record<string, unknown>).status === 'error');
		expect(errorUpdate).toBeTruthy();
		expect((errorUpdate![0] as Record<string, unknown>).error_message).toContain('zona activa');
	});

	it('envía email de domain_error si la zona no existe', async () => {
		spyGetZoneByName.mockImplementation(async () => null);
		await runSetup();
		const emailCall = spySendEmail.mock.calls[0][0] as { type: string };
		expect(emailCall.type).toBe('domain_error');
	});

	it('NO llama a addDomainToProject si la zona no existe', async () => {
		spyGetZoneByName.mockImplementation(async () => null);
		await runSetup();
		expect(spyAddDomainToProject.mock.calls.length).toBe(0);
	});

	it('marca status=error si la zona existe pero no está active', async () => {
		spyGetZoneByName.mockImplementation(async () => ({ id: 'z', name: 'test.com', status: 'pending' }));
		const sb = await runSetup();

		const errorUpdate = (sb._update as ReturnType<typeof mock>).mock.calls
			.find(c => (c[0] as Record<string, unknown>).status === 'error');
		expect(errorUpdate).toBeTruthy();
	});
});

// ── Fallos en pasos posteriores ───────────────────────────────────────────────

describe('startDomainSetup — fallo en addDomainToProject', () => {
	it('marca status=error', async () => {
		spyAddDomainToProject.mockImplementation(async () => { throw new Error('Vercel API error'); });
		const sb = await runSetup();

		const errorUpdate = (sb._update as ReturnType<typeof mock>).mock.calls
			.find(c => (c[0] as Record<string, unknown>).status === 'error');
		expect(errorUpdate).toBeTruthy();
	});

	it('NO llama a addDnsRecord si addDomainToProject falla', async () => {
		spyAddDomainToProject.mockImplementation(async () => { throw new Error('fail'); });
		await runSetup();
		expect(spyAddDnsRecord.mock.calls.length).toBe(0);
	});
});

describe('startDomainSetup — fallo en addDnsRecord', () => {
	it('marca status=error si el DNS falla', async () => {
		spyAddDnsRecord.mockImplementation(async () => { throw new Error('CF DNS error: duplicate'); });
		const sb = await runSetup();

		const errorUpdate = (sb._update as ReturnType<typeof mock>).mock.calls
			.find(c => (c[0] as Record<string, unknown>).status === 'error');
		expect(errorUpdate).toBeTruthy();
		expect((errorUpdate![0] as Record<string, unknown>).error_message).toContain('DNS error');
	});
});

describe('startDomainSetup — fallo en createCacheRule', () => {
	it('marca status=error', async () => {
		spyCreateCacheRule.mockImplementation(async () => { throw new Error('CF CacheRule error: forbidden'); });
		const sb = await runSetup();

		const errorUpdate = (sb._update as ReturnType<typeof mock>).mock.calls
			.find(c => (c[0] as Record<string, unknown>).status === 'error');
		expect(errorUpdate).toBeTruthy();
	});

	it('NO llama a createApexRedirectRule si createCacheRule falla', async () => {
		spyCreateCacheRule.mockImplementation(async () => { throw new Error('fail'); });
		await runSetup();
		expect(spyCreateApexRedirectRule.mock.calls.length).toBe(0);
	});
});

describe('startDomainSetup — fallo en createApexRedirectRule', () => {
	it('marca status=error si la redirect rule falla', async () => {
		spyCreateApexRedirectRule.mockImplementation(async () => { throw new Error('CF RedirectRule error'); });
		const sb = await runSetup();

		const errorUpdate = (sb._update as ReturnType<typeof mock>).mock.calls
			.find(c => (c[0] as Record<string, unknown>).status === 'error');
		expect(errorUpdate).toBeTruthy();
	});
});

// ── Audit log en caso de error ────────────────────────────────────────────────

describe('startDomainSetup — audit log en error', () => {
	it('registra audit log con status=error cuando falla la zona', async () => {
		spyGetZoneByName.mockImplementation(async () => null);
		await runSetup();

		const auditCall = spyLogAudit.mock.calls[0][0] as Record<string, unknown>;
		expect(auditCall.status).toBe('error');
		expect(auditCall.action).toBe('configure');
	});
});

// ── disconnectDomain ──────────────────────────────────────────────────────────

describe('disconnectDomain', () => {
	it('llama a removeDomainFromProject con el dominio', async () => {
		const sb = makeSupabase();
		await disconnectDomain('dom-1', 'bye.com', 'proj-1', 'user-1', 'actor@test.com', sb as never);
		expect(spyRemoveDomainFromProject.mock.calls[0][0]).toBe('bye.com');
	});

	it('actualiza el dominio como is_active=false y status=pending', async () => {
		const sb = makeSupabase();
		await disconnectDomain('dom-1', 'bye.com', 'proj-1', 'user-1', 'actor@test.com', sb as never);

		const updateCall = (sb._update as ReturnType<typeof mock>).mock.calls[0][0] as Record<string, unknown>;
		expect(updateCall.is_active).toBe(false);
		expect(updateCall.status).toBe('pending');
	});

	it('registra audit log con action=disconnect', async () => {
		const sb = makeSupabase();
		await disconnectDomain('dom-1', 'bye.com', 'proj-1', 'user-1', 'actor@test.com', sb as never);

		const auditCall = spyLogAudit.mock.calls[0][0] as Record<string, unknown>;
		expect(auditCall.action).toBe('disconnect');
		expect(auditCall.resourceType).toBe('domain');
		expect(auditCall.resourceName).toBe('bye.com');
	});

	it('pasa los IDs correctos al audit log', async () => {
		const sb = makeSupabase();
		await disconnectDomain('dom-99', 'otro.com', 'proj-99', 'user-99', 'yo@test.com', sb as never);

		const auditCall = spyLogAudit.mock.calls[0][0] as Record<string, unknown>;
		expect(auditCall.projectId).toBe('proj-99');
		expect(auditCall.resourceId).toBe('dom-99');
	});
});

// ── Integración: secuencia de pasos ──────────────────────────────────────────

describe('integración — secuencia de pasos en happy path', () => {
	it('los pasos se ejecutan en el orden correcto', async () => {
		const callOrder: string[] = [];

		spyGetZoneByName.mockImplementation(async () => { callOrder.push('getZoneByName'); return ACTIVE_ZONE; });
		spyAddDomainToProject.mockImplementation(async () => { callOrder.push('addDomainToProject'); return { name: 'test.com', apexName: 'test.com', verified: false, cnamTarget: 'cname.vercel-dns.com', verification: [] }; });
		spyAddDnsRecord.mockImplementation(async () => { callOrder.push('addDnsRecord'); return { id: 'r', type: 'CNAME', name: 'www', content: 'cname' }; });
		spyCreateCacheRule.mockImplementation(async () => { callOrder.push('createCacheRule'); return 'cr'; });
		spyCreateApexRedirectRule.mockImplementation(async () => { callOrder.push('createApexRedirectRule'); return 'rr'; });
		spyLogAudit.mockImplementation(async () => { callOrder.push('logAudit'); });
		spySendEmail.mockImplementation(async () => { callOrder.push('sendEmail'); });

		await runSetup();

		expect(callOrder[0]).toBe('getZoneByName');
		expect(callOrder[1]).toBe('addDomainToProject');
		const cacheIdx    = callOrder.indexOf('createCacheRule');
		const redirectIdx = callOrder.indexOf('createApexRedirectRule');
		const auditIdx    = callOrder.indexOf('logAudit');
		const emailIdx    = callOrder.indexOf('sendEmail');
		expect(cacheIdx).toBeLessThan(redirectIdx);
		expect(redirectIdx).toBeLessThan(auditIdx);
		expect(auditIdx).toBeLessThan(emailIdx);
	});
});
