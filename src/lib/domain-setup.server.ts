import type { SupabaseClient } from '@supabase/supabase-js';
import { waitUntil } from '@vercel/functions';
import {
	getZoneByName,
	addDnsRecord,
	createCacheRule,
	createApexRedirectRule,
} from './cloudflare-registrar.server';
import { addDomainToProject, removeDomainFromProject } from './vercel-domains.server';
import { sendEmail } from './email.server';
import { logAudit } from './audit';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface SetupParams {
	domainId:    string;
	domain:      string;
	projectId:   string;
	projectName: string;
	userId:      string;
	actor:       string;
	/** Si el admin ya conoce el zone_id de CF, se usa directamente (evita el lookup). */
	existingZoneId?: string;
}

// ── Función pública — dispara la configuración en background ──────────────────

/**
 * Lanza la configuración completa del dominio en background via waitUntil.
 * Asume que el dominio ya fue comprado manualmente en Cloudflare Registrar
 * y que su zona existe (o se proporciona explícitamente via existingZoneId).
 */
export function startDomainSetup(params: SetupParams, supabase: SupabaseClient): void {
	waitUntil(_runSetup(params, supabase));
}

// ── Orquestador interno ───────────────────────────────────────────────────────

async function _runSetup(params: SetupParams, supabase: SupabaseClient): Promise<void> {
	const { domainId, domain, projectId, projectName, userId, actor, existingZoneId } = params;

	// Paso 0 — marcar como 'configuring'
	await supabase
		.from('domains')
		.update({ status: 'configuring', error_message: null })
		.eq('id', domainId);

	try {
		// Paso 1 — resolver zona CF
		// Si el admin pasó el zone_id (caso "ya sé cuál es"), lo usamos directamente.
		// Si no, lo buscamos por nombre de dominio. Si no existe, error descriptivo.
		let cfZoneId: string;

		if (existingZoneId) {
			cfZoneId = existingZoneId;
		} else {
			const zone = await getZoneByName(domain);
			if (!zone || zone.status !== 'active') {
				throw new Error(
					`No se encontró una zona activa en Cloudflare para ${domain}. ` +
					`Verifica que el dominio fue comprado y procesado en dash.cloudflare.com.`,
				);
			}
			cfZoneId = zone.id;
		}

		// Paso 2 — registrar dominio en Vercel
		const vercelResult = await addDomainToProject(domain);

		// Paso 3 — DNS: www y apex apuntan a Vercel vía CF (proxied)
		// CF aplana el CNAME en el apex (CNAME Flattening).
		await Promise.all([
			addDnsRecord(cfZoneId, 'CNAME', `www.${domain}`, vercelResult.cnamTarget, true),
			addDnsRecord(cfZoneId, 'CNAME', domain,           vercelResult.cnamTarget, true),
		]);

		// Paso 4 — Cache Rule (30 días en edge, alineada con [...slug].astro)
		const cfCacheRuleId = await createCacheRule(cfZoneId, domain);

		// Paso 5 — Redirect Rule: apex → www (301)
		const cfRedirectRuleId = await createApexRedirectRule(cfZoneId, domain);

		// Paso 6 — guardar IDs y marcar como activo
		await supabase
			.from('domains')
			.update({
				status:              'active',
				error_message:       null,
				cf_zone_id:          cfZoneId,
				cf_cache_rule_id:    cfCacheRuleId,
				cf_redirect_rule_id: cfRedirectRuleId,
				vercel_domain_id:    vercelResult.name,
				dns_verified_at:     new Date().toISOString(),
			})
			.eq('id', domainId);

		// Paso 7 — audit log
		await logAudit({
			supabase,
			projectId,
			userId,
			actor,
			action:       'configure',
			resourceType: 'domain',
			resourceId:   domainId,
			resourceName: domain,
			status:       'ok',
		});

		// Paso 8 — email de confirmación
		await sendEmail({ type: 'domain_configured', domain, projectName });

	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error(`[domain-setup] Error configurando ${domain}:`, err);

		await supabase
			.from('domains')
			.update({ status: 'error', error_message: errorMessage })
			.eq('id', domainId);

		await logAudit({
			supabase,
			projectId,
			userId,
			actor,
			action:       'configure',
			resourceType: 'domain',
			resourceId:   domainId,
			resourceName: domain,
			status:       'error',
			errorMessage,
		});

		await sendEmail({ type: 'domain_error', domain, error: errorMessage });
	}
}

// ── Desconectar dominio ───────────────────────────────────────────────────────

/**
 * Elimina el dominio de Vercel y lo marca como inactivo en DB.
 * No elimina la zona CF (puede tener otros usos o configuración manual).
 */
export async function disconnectDomain(
	domainId:  string,
	domain:    string,
	projectId: string,
	userId:    string,
	actor:     string,
	supabase:  SupabaseClient,
): Promise<void> {
	await removeDomainFromProject(domain);

	await supabase
		.from('domains')
		.update({ is_active: false, status: 'pending' })
		.eq('id', domainId);

	await logAudit({
		supabase,
		projectId,
		userId,
		actor,
		action:       'disconnect',
		resourceType: 'domain',
		resourceId:   domainId,
		resourceName: domain,
	});
}
