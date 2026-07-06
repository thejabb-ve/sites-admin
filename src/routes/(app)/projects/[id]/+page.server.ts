import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	// RLS garantiza que si el proyecto no es del usuario, devuelve null
	const { data: project } = await locals.supabase
		.from('projects')
		.select('id, name, created_at')
		.eq('id', params.id)
		.single();

	if (!project) error(404, 'Proyecto no encontrado o sin acceso.');

	const [{ data: domains }, { data: rawMembers }] = await Promise.all([
		locals.supabase
			.from('domains')
			.select('id, domain, is_active')
			.eq('project_id', params.id)
			.order('domain'),
		locals.supabase
			.from('project_members')
			.select('user_id, role_id, created_at, project_roles(name)')
			.eq('project_id', params.id)
			.order('created_at')
	]);

	// user_profiles no tiene FK directa desde project_members, se resuelve aparte.
	const userIds = (rawMembers ?? []).map((m) => m.user_id);
	const { data: profiles } =
		userIds.length > 0
			? await locals.supabase
					.from('user_profiles')
					.select('user_id, display_name')
					.in('user_id', userIds)
			: { data: [] };

	const profileMap = new Map((profiles ?? []).map((p) => [p.user_id, p.display_name]));

	const members = (rawMembers ?? []).map((m) => ({
		user_id: m.user_id,
		display_name: profileMap.get(m.user_id) ?? m.user_id,
		role_name: (m.project_roles as { name: string } | null)?.name ?? '—',
		created_at: m.created_at
	}));

	return {
		project,
		domains: domains ?? [],
		members
	};
};
