import {
	CLOUDFLARE_API_TOKEN,
	CLOUDFLARE_ACCOUNT_ID,
} from '$env/static/private';

const CF_API = 'https://api.cloudflare.com/client/v4';

// Datos de la agencia como registrante de todos los dominios de clientes.
// La privacidad WHOIS está activada, así que no son públicos.
// Si en el futuro quieres que un cliente sea el titular, puedes transferir
// el dominio desde el panel de CF Registrar sin tocar código.
const AGENCY_CONTACT = {
	first_name: 'Agencia',
	last_name:  'Jabb',
	email:      'agencia.jabb@gmail.com',
	phone:      '+584126043368',
	address: {
		address:     'Av entre Segunda y Tercera, Res Maury, Piso 1, Ap 2',
		city:        'Caracas',
		state:       'Miranda',
		postal_code: '1060',
		country:     'VE',
	},
} as const;

function cfHeaders() {
	return {
		Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
		'Content-Type': 'application/json',
	};
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface DomainAvailability {
	available: boolean;
	price?: number;
	currency?: string;
}

export interface CfZone {
	id: string;
	name: string;
	status: string;
}

export interface CfDnsRecord {
	id: string;
	type: string;
	name: string;
	content: string;
}

// ── Disponibilidad ─────────────────────────────────────────────────────────────

export async function checkAvailability(domain: string): Promise<DomainAvailability> {
	// rdap.org es un proxy RDAP público que enruta al servidor autoritativo del TLD.
	// 404 = dominio no registrado (disponible), 2xx = registrado (no disponible).
	const res = await fetch(`https://rdap.org/domain/${domain}`, {
		headers:  { Accept: 'application/rdap+json' },
		redirect: 'follow',
	});
	if (res.status === 404) return { available: true };
	if (res.ok) return { available: false };
	throw new Error(`Error comprobando disponibilidad de ${domain} (HTTP ${res.status})`);
}

// ── Compra de dominio ─────────────────────────────────────────────────────────

export async function purchaseDomain(domain: string): Promise<void> {
	const res  = await fetch(
		`${CF_API}/accounts/${CLOUDFLARE_ACCOUNT_ID}/registrar/domains/${domain}/registration`,
		{
			method:  'POST',
			headers: cfHeaders(),
			body:    JSON.stringify({
				auto_renew:         true,
				years:              1,
				privacy:            true,
				registrant_contact: AGENCY_CONTACT,
			}),
		},
	);
	const json = (await res.json()) as { success: boolean; errors: { message: string }[] };
	if (!json.success) {
		throw new Error(`CF Registrar error: ${json.errors.map(e => e.message).join(', ')}`);
	}
}

// ── Zona CF ───────────────────────────────────────────────────────────────────

export async function getZoneByName(domain: string): Promise<CfZone | null> {
	const res  = await fetch(`${CF_API}/zones?name=${domain}`, { headers: cfHeaders() });
	const json = (await res.json()) as { success: boolean; result: CfZone[] };
	if (!json.success || json.result.length === 0) return null;
	return json.result[0] ?? null;
}

/** Espera hasta `timeoutMs` ms a que CF cree la zona automáticamente tras la compra.
 *  `intervalMs` es inyectable para acelerar tests (por defecto 5 s en producción). */
export async function pollZoneReady(
	domain: string,
	timeoutMs  = 90_000,
	intervalMs = 5_000,
): Promise<CfZone> {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		const zone = await getZoneByName(domain);
		if (zone && zone.status === 'active') return zone;
		const remaining = deadline - Date.now();
		if (remaining <= 0) break;
		await new Promise(r => setTimeout(r, Math.min(intervalMs, remaining)));
	}
	throw new Error(`Tiempo de espera agotado: zona CF de ${domain} no activa tras ${timeoutMs / 1000}s`);
}

/** Crea una zona CF nueva para un dominio (cuando no viene de CF Registrar). */
export async function createZone(domain: string): Promise<CfZone> {
	const res  = await fetch(`${CF_API}/zones`, {
		method:  'POST',
		headers: cfHeaders(),
		body:    JSON.stringify({
			name:       domain,
			account:    { id: CLOUDFLARE_ACCOUNT_ID },
			jump_start: false,
			type:       'full',
		}),
	});
	const json = (await res.json()) as { success: boolean; result: CfZone; errors: { message: string }[] };
	if (!json.success) {
		throw new Error(`CF createZone error: ${json.errors.map(e => e.message).join(', ')}`);
	}
	return json.result;
}

// ── DNS ───────────────────────────────────────────────────────────────────────

export async function addDnsRecord(
	zoneId: string,
	type: 'A' | 'CNAME' | 'TXT',
	name: string,
	content: string,
	proxied = true,
): Promise<CfDnsRecord> {
	const res  = await fetch(`${CF_API}/zones/${zoneId}/dns_records`, {
		method:  'POST',
		headers: cfHeaders(),
		body:    JSON.stringify({ type, name, content, proxied, ttl: 1 }),
	});
	const json = (await res.json()) as { success: boolean; result: CfDnsRecord; errors: { message: string }[] };
	if (!json.success) {
		throw new Error(`CF DNS error (${type} ${name}): ${json.errors.map(e => e.message).join(', ')}`);
	}
	return json.result;
}

// ── Cache Rule ────────────────────────────────────────────────────────────────

export async function createCacheRule(zoneId: string, domain: string): Promise<string> {
	// TTLs alineados con los headers que emite [...slug].astro:
	// s-maxage=2592000 (30 días en edge), stale-while-revalidate=3600 (1 h)
	const res  = await fetch(
		`${CF_API}/zones/${zoneId}/rulesets/phases/http_request_cache_settings/entrypoint`,
		{
			method:  'PUT',
			headers: cfHeaders(),
			body:    JSON.stringify({
				name:  'Cache Rules — Superplantilla',
				rules: [
					{
						expression:  `(http.host eq "www.${domain}" or http.host eq "${domain}")`,
						description: 'Cache 30 días en edge, respetar Cache-Tag para purga selectiva',
						action:      'set_cache_settings',
						action_parameters: {
							cache: true,
							edge_ttl: {
								mode:    'override_origin',
								default: 2592000, // 30 días
							},
							browser_ttl: {
								mode:    'respect_origin', // respeta max-age=0 del header → no cachea en browser
							},
							serve_stale: { disable_stale_while_updating: false },
						},
					},
				],
			}),
		},
	);
	const json = (await res.json()) as { success: boolean; result: { id: string }; errors: { message: string }[] };
	if (!json.success) {
		throw new Error(`CF CacheRule error: ${json.errors.map(e => e.message).join(', ')}`);
	}
	return json.result.id;
}

// ── Redirect Rule (apex → www) ────────────────────────────────────────────────

export async function createApexRedirectRule(zoneId: string, domain: string): Promise<string> {
	const res  = await fetch(
		`${CF_API}/zones/${zoneId}/rulesets/phases/http_request_dynamic_redirect/entrypoint`,
		{
			method:  'PUT',
			headers: cfHeaders(),
			body:    JSON.stringify({
				name:  'Redirect apex → www',
				rules: [
					{
						expression:  `(http.host eq "${domain}")`,
						description: `${domain} → https://www.${domain}`,
						action:      'redirect',
						action_parameters: {
							from_value: {
								status_code: 301,
								target_url:  {
									expression: `concat("https://www.${domain}", http.request.uri.path)`,
								},
								preserve_query_string: true,
							},
						},
					},
				],
			}),
		},
	);
	const json = (await res.json()) as { success: boolean; result: { id: string }; errors: { message: string }[] };
	if (!json.success) {
		throw new Error(`CF RedirectRule error: ${json.errors.map(e => e.message).join(', ')}`);
	}
	return json.result.id;
}
