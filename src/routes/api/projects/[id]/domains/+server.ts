import type { RequestHandler } from './$types';
import { checkAvailability } from '$lib/cloudflare-registrar.server';
import { startDomainSetup, disconnectDomain } from '$lib/domain-setup.server';

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

function isValidDomain(domain: string): boolean {
	return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(domain.toLowerCase());
}

// GET ?check=domain.com  → comprobación de disponibilidad
// GET ?statusOf=domainId → estado actual del dominio (para polling del wizard)
export const GET: RequestHandler = async ({ url, params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'No autenticado' }, 401);

	const checkDomain = url.searchParams.get('check');
	if (checkDomain) {
		if (!isValidDomain(checkDomain)) {
			return json({ error: 'Formato de dominio inválido.' }, 400);
		}
		try {
			const availability = await checkAvailability(checkDomain);
			return json(availability);
		} catch (err) {
			return json({ error: err instanceof Error ? err.message : 'Error desconocido' }, 502);
		}
	}

	const domainId = url.searchParams.get('statusOf');
	if (domainId) {
		const { data: domain } = await locals.supabase
			.from('domains')
			.select('id, status, error_message, cf_zone_id, vercel_domain_id')
			.eq('id', domainId)
			.eq('project_id', params.id)
			.single();
		if (!domain) return json({ error: 'Dominio no encontrado' }, 404);
		return json(domain);
	}

	return json({ error: 'Parámetro requerido: check o statusOf' }, 400);
};

// POST { domain, existingZoneId? }
// → inserta el dominio en DB y lanza la configuración en background
export const POST: RequestHandler = async ({ request, params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'No autenticado' }, 401);

	const { data: project } = await locals.supabase
		.from('projects')
		.select('id, name')
		.eq('id', params.id)
		.single();
	if (!project) return json({ error: 'Proyecto no encontrado' }, 404);

	let body: { domain?: string; existingZoneId?: string };
	try {
		body = await request.json() as typeof body;
	} catch {
		return json({ error: 'Cuerpo JSON inválido' }, 400);
	}

	const domain = String(body.domain ?? '').trim().toLowerCase();

	if (!isValidDomain(domain)) {
		return json({ error: 'Formato de dominio inválido.' }, 400);
	}

	// Comprobar que no existe ya en el proyecto
	const { data: existing } = await locals.supabase
		.from('domains')
		.select('id')
		.eq('project_id', params.id)
		.eq('domain', domain)
		.maybeSingle();

	if (existing) return json({ error: `El dominio ${domain} ya está registrado en este proyecto.` }, 409);

	// Insertar en DB con status='pending'
	const { data: inserted, error: dbErr } = await locals.supabase
		.from('domains')
		.insert({ project_id: params.id, domain, is_primary: false, is_active: true, status: 'pending' })
		.select('id')
		.single();

	if (dbErr || !inserted) {
		return json({ error: 'Error al registrar el dominio.' }, 500);
	}

	// Lanzar configuración en background (no bloquea esta respuesta)
	startDomainSetup(
		{
			domainId:       inserted.id,
			domain,
			projectId:      params.id,
			projectName:    project.name,
			userId:         user.id,
			actor:          user.email ?? 'desconocido',
			existingZoneId: body.existingZoneId,
		},
		locals.supabase,
	);

	return json({ ok: true, domainId: inserted.id }, 201);
};

// DELETE { domainId }
export const DELETE: RequestHandler = async ({ request, params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'No autenticado' }, 401);

	let body: { domainId?: string };
	try {
		body = await request.json() as typeof body;
	} catch {
		return json({ error: 'Cuerpo JSON inválido' }, 400);
	}

	const domainId = String(body.domainId ?? '').trim();
	if (!domainId) return json({ error: 'domainId requerido' }, 400);

	// Verificar que el dominio pertenece al proyecto
	const { data: domain } = await locals.supabase
		.from('domains')
		.select('id, domain')
		.eq('id', domainId)
		.eq('project_id', params.id)
		.single();

	if (!domain) return json({ error: 'Dominio no encontrado' }, 404);

	await disconnectDomain(
		domainId,
		domain.domain,
		params.id,
		user.id,
		user.email ?? 'desconocido',
		locals.supabase,
	);

	return json({ ok: true });
};

export const fallback: RequestHandler = () => json({ error: 'Método no permitido' }, 405);
