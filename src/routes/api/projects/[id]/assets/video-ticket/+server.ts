import type { RequestHandler } from './$types';
import { CDN_WORKER_URL, CDN_UPLOAD_SECRET } from '$env/static/private';

export const POST: RequestHandler = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) return json({ error: 'No autenticado' }, 401);

	const { data: project } = await locals.supabase
		.from('projects')
		.select('id')
		.eq('id', params.id)
		.single();
	if (!project) return json({ error: 'Proyecto no encontrado' }, 404);

	let ticketData: { ticket: string; expires: string; projectId: string };
	try {
		const res = await fetch(`${CDN_WORKER_URL}/upload-ticket`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${CDN_UPLOAD_SECRET}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ project_id: params.id }),
		});
		if (!res.ok) return json({ error: 'Error generando ticket de subida' }, 502);
		ticketData = await res.json() as { ticket: string; expires: string; projectId: string };
	} catch (err) {
		console.error('[video-ticket] CDN error:', err);
		return json({ error: 'Error generando ticket de subida' }, 502);
	}

	return json({ cdnUrl: CDN_WORKER_URL, ...ticketData });
};

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
