import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { data: project } = await locals.supabase
		.from('projects')
		.select('id, name')
		.eq('id', params.id)
		.single();

	if (!project) error(404, 'Proyecto no encontrado.');

	const { data: domains } = await locals.supabase
		.from('domains')
		.select('id, domain, is_active, status, error_message, cf_zone_id, vercel_domain_id, dns_verified_at, created_at')
		.eq('project_id', params.id)
		.order('created_at', { ascending: true });

	return { project, domains: domains ?? [] };
};
