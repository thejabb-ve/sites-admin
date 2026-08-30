import { VERCEL_API_TOKEN, VERCEL_PROJECT_ID } from '$env/static/private';

const VERCEL_API = 'https://api.vercel.com';

function vercelHeaders() {
	return {
		Authorization: `Bearer ${VERCEL_API_TOKEN}`,
		'Content-Type': 'application/json',
	};
}

/**
 * fetch a la API de Vercel; lanza si la respuesta no es `ok` y su status no está en `okStatuses`.
 * Con `parseJson: false` no intenta leer el cuerpo (necesario en DELETE, cuyo cuerpo puede venir vacío).
 */
async function vercelRequest<T = void>(
	path: string,
	init: RequestInit | undefined,
	errPrefix: string,
	opts: { okStatuses?: number[]; parseJson?: boolean } = {},
): Promise<T> {
	const { okStatuses = [], parseJson = true } = opts;
	const res = await fetch(`${VERCEL_API}${path}`, { ...init, headers: vercelHeaders() });
	const ok  = res.ok || okStatuses.includes(res.status);

	if (!parseJson) {
		if (!ok) throw new Error(`${errPrefix}: ${res.statusText}`);
		return undefined as T;
	}

	if (!ok) {
		const errJson = await res.json().catch(() => null) as { error?: { message?: string } } | null;
		throw new Error(`${errPrefix}: ${errJson?.error?.message ?? res.statusText}`);
	}
	return (await res.json()) as T;
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
	// 409 = dominio ya añadido al proyecto → no es error
	return vercelRequest<VercelDomainRaw>(
		`/v10/projects/${VERCEL_PROJECT_ID}/domains`,
		{ method: 'POST', body: JSON.stringify({ name: domain }) },
		`Vercel addDomain(${domain})`,
		{ okStatuses: [409] },
	);
}

// ── Consultar estado del dominio ──────────────────────────────────────────────

export async function getDomainInfo(domain: string): Promise<VercelDomainResult> {
	const json = await vercelRequest<{
		name?: string;
		apexName?: string;
		verified?: boolean;
		verification?: VercelVerification[];
	}>(
		`/v10/projects/${VERCEL_PROJECT_ID}/domains/${domain}`,
		undefined,
		`Vercel getDomainInfo(${domain})`,
	);
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
	// 404 = ya no estaba registrado → no es error
	await vercelRequest(
		`/v10/projects/${VERCEL_PROJECT_ID}/domains/${domain}`,
		{ method: 'DELETE' },
		`Vercel removeDomain(${domain})`,
		{ okStatuses: [404], parseJson: false },
	);
}
