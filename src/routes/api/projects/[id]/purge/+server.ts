import type { RequestHandler } from './$types';
import { logAudit } from '$lib/audit';

const CF_API = 'https://api.cloudflare.com/client/v4';

export const POST: RequestHandler = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'No autenticado' }, 401);

	const { data: project } = await locals.supabase
		.from('projects')
		.select('id')
		.eq('id', params.id)
		.single();
	if (!project) return json({ error: 'Proyecto no encontrado' }, 404);

	const cfToken  = process.env['CLOUDFLARE_API_TOKEN'] ?? '';
	const cfZoneId = process.env['CLOUDFLARE_ZONE_ID']   ?? '';

	if (!cfToken || !cfZoneId) {
		console.warn('[purge] Credenciales CF no configuradas');
		return json({ error: 'Servicio no configurado' }, 503);
	}

	const tag = `project:${params.id}`;
	const res = await fetch(`${CF_API}/zones/${cfZoneId}/purge_cache`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${cfToken}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ tags: [tag] }),
	}).catch(() => null);

	if (!res) return json({ error: 'Error de red al contactar Cloudflare' }, 502);

	const data = await res.json() as { success: boolean; errors: { code: number }[] };

	// Plan Free/Pro: Cache Tag purging no disponible — se considera éxito parcial
	if (!data.success && data.errors?.some(e => e.code === 1049)) {
		await logAudit({
			supabase: locals.supabase,
			projectId: params.id,
			userId: user.id,
			actor: user.email ?? 'desconocido',
			action: 'purge_cache',
			resourceType: 'cache',
			resourceName: tag,
			status: 'ok',
		});
		return json({ ok: true, fallback: true }, 200);
	}

	if (!data.success) {
		console.error('[purge] CF purge failed', { tag, errors: data.errors });
		const errMsg = data.errors?.map((e: { code: number }) => `CF error ${e.code}`).join(', ') ?? 'CF purge failed';
		await logAudit({
			supabase: locals.supabase,
			projectId: params.id,
			userId: user.id,
			actor: user.email ?? 'desconocido',
			action: 'purge_cache',
			resourceType: 'cache',
			resourceName: tag,
			status: 'error',
			errorMessage: errMsg,
		});
		return json({ error: 'Error al purgar la caché en Cloudflare' }, 502);
	}

	await logAudit({
		supabase: locals.supabase,
		projectId: params.id,
		userId: user.id,
		actor: user.email ?? 'desconocido',
		action: 'purge_cache',
		resourceType: 'cache',
		resourceName: tag,
		status: 'ok',
	});
	return json({ ok: true }, 200);
};

export const fallback: RequestHandler = () =>
	json({ error: 'Método no permitido' }, 405);

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
