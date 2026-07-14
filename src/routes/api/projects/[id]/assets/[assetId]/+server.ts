import type { RequestHandler } from './$types';
import { CDN_WORKER_URL, CDN_UPLOAD_SECRET } from '$env/static/private';
import { logAudit } from '$lib/audit';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'No autenticado' }, 401);

	const { data: asset } = await locals.supabase
		.from('assets')
		.select('id, key, original_key, cluster_key, thumb_key, filename')
		.eq('id', params.assetId)
		.eq('project_id', params.id)
		.single();

	if (!asset) return json({ error: 'Asset no encontrado' }, 404);

	// Eliminar todas las keys no-null del CDN en paralelo
	const keys = [asset.key, asset.original_key, asset.cluster_key, asset.thumb_key]
		.filter((k): k is string => !!k);

	const uniqueKeys = [...new Set(keys)];

	await Promise.allSettled(
		uniqueKeys.map(async (key) => {
			try {
				await fetch(`${CDN_WORKER_URL}/delete`, {
					method: 'DELETE',
					headers: {
						Authorization: `Bearer ${CDN_UPLOAD_SECRET}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ key }),
				});
			} catch (err) {
				console.error('[assets/delete] CDN error:', key, err);
			}
		}),
	);

	const { error: dbErr } = await locals.supabase
		.from('assets')
		.delete()
		.eq('id', params.assetId)
		.eq('project_id', params.id);

	if (dbErr) {
		console.error('[assets/delete] Supabase error:', dbErr.message);
		return json({ error: 'Error eliminando asset de la base de datos' }, 500);
	}

	await logAudit({
		supabase: locals.supabase,
		projectId: params.id,
		userId: user.id,
		actor: user.email ?? 'desconocido',
		action: 'delete',
		resourceType: 'asset',
		resourceId: params.assetId,
		resourceName: asset.filename ?? params.assetId,
	});

	return json({ ok: true });
};

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
