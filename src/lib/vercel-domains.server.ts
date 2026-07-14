import { VERCEL_API_TOKEN, VERCEL_PROJECT_ID } from '$env/static/private';

const VERCEL_API = 'https://api.vercel.com';

function vercelHeaders() {
	return {
		Authorization: `Bearer ${VERCEL_API_TOKEN}`,
		'Content-Type': 'application/json',
	};
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface VercelDomainResult {
	name: string;
	apexName: string;
	verified: boolean;
	/** CNAME target que hay que apuntar en el DNS del dominio (siempre cname.vercel-dns.com) */
	cnamTarget: string;
	verification: VercelVerification[];
}

export interface VercelVerification {
	type: string;
	domain: string;
	value: string;
	reason: string;
}

// ── Añadir dominio al proyecto ────────────────────────────────────────────────

export async function addDomainToProject(domain: string): Promise<VercelDomainResult> {
	// Usa allSettled para que un fallo en www.dominio no cancele el apex
	const [apexSettled, wwwSettled] = await Promise.allSettled([
		_addSingleDomain(domain),
		_addSingleDomain(`www.${domain}`),
	]);

	// www failure es no-fatal — el DNS www CNAME aún apuntará a Vercel vía CF
	if (wwwSettled.status === 'rejected') {
		console.warn(`[vercel-domains] addDomain(www.${domain}) failed (non-fatal):`, wwwSettled.reason);
	}

	// apex failure es fatal — sin él Vercel no acepta el dominio
	if (apexSettled.status === 'rejected') {
		throw apexSettled.reason;
	}

	const apexRes = apexSettled.value;
	const wwwRes  = wwwSettled.status === 'fulfilled' ? wwwSettled.value : {};

	return {
		name:         apexRes.name         ?? domain,
		apexName:     apexRes.apexName     ?? domain,
		verified:     apexRes.verified     ?? false,
		cnamTarget:   'cname.vercel-dns.com',
		verification: apexRes.verification ?? wwwRes.verification ?? [],
	};
}

type VercelDomainRaw = {
	name?: string;
	apexName?: string;
	verified?: boolean;
	verification?: VercelVerification[];
	error?: { message?: string };
};

async function _addSingleDomain(domain: string): Promise<VercelDomainRaw> {
	const res  = await fetch(
		`${VERCEL_API}/v10/projects/${VERCEL_PROJECT_ID}/domains`,
		{
			method:  'POST',
			headers: vercelHeaders(),
			body:    JSON.stringify({ name: domain }),
		},
	);
	const json = (await res.json()) as VercelDomainRaw;

	// 409 = dominio ya añadido al proyecto → no es error
	if (res.status === 409) return json;

	if (!res.ok) {
		throw new Error(`Vercel addDomain(${domain}): ${json.error?.message ?? res.statusText}`);
	}
	return json;
}

// ── Consultar estado del dominio ──────────────────────────────────────────────

export async function getDomainInfo(domain: string): Promise<VercelDomainResult> {
	const res  = await fetch(
		`${VERCEL_API}/v10/projects/${VERCEL_PROJECT_ID}/domains/${domain}`,
		{ headers: vercelHeaders() },
	);
	if (!res.ok) {
		throw new Error(`Vercel getDomainInfo(${domain}): ${res.statusText}`);
	}
	const json = (await res.json()) as {
		name?: string;
		apexName?: string;
		verified?: boolean;
		verification?: VercelVerification[];
	};
	return {
		name:         json.name         ?? domain,
		apexName:     json.apexName     ?? domain,
		verified:     json.verified     ?? false,
		cnamTarget:   'cname.vercel-dns.com',
		verification: json.verification ?? [],
	};
}

// ── Eliminar dominio del proyecto ─────────────────────────────────────────────

export async function removeDomainFromProject(domain: string): Promise<void> {
	// Elimina apex y www
	await Promise.allSettled([
		_removeSingleDomain(domain),
		_removeSingleDomain(`www.${domain}`),
	]);
}

async function _removeSingleDomain(domain: string): Promise<void> {
	const res = await fetch(
		`${VERCEL_API}/v10/projects/${VERCEL_PROJECT_ID}/domains/${domain}`,
		{ method: 'DELETE', headers: vercelHeaders() },
	);
	// 404 = ya no estaba registrado → no es error
	if (!res.ok && res.status !== 404) {
		throw new Error(`Vercel removeDomain(${domain}): ${res.statusText}`);
	}
}
