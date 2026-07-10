import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 25;

const RESOURCE_TYPE_LABELS: Record<string, string> = {
	page:     'Páginas',
	asset:    'Assets',
	brand:    'Marca',
	settings: 'Configuración',
	template: 'Plantilla',
	block:    'Bloques',
	cache:    'Caché',
};

const RESOURCE_TYPE_FILTERS = Object.entries(RESOURCE_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export const load: PageServerLoad = async ({ locals, params, url }) => {
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

	// ── Audit log ─────────────────────────────────────────────────────────────

	const logPage = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
	const logType = url.searchParams.get('type') ?? 'all';
	const offset  = (logPage - 1) * PAGE_SIZE;

	let auditQuery = locals.supabase
		.from('audit_log')
		.select('id, actor, action, resource_type, resource_id, resource_name, changed, status, error_message, created_at', { count: 'exact' })
		.eq('project_id', params.id)
		.order('created_at', { ascending: false })
		.range(offset, offset + PAGE_SIZE - 1);

	if (logType !== 'all') {
		auditQuery = auditQuery.eq('resource_type', logType);
	}

	const { data: logs, count: logTotal } = await auditQuery;

	const logTotalPages = Math.ceil((logTotal ?? 0) / PAGE_SIZE);

	return {
		project,
		domains: domains ?? [],
		members,
		logs: logs ?? [],
		logPage,
		logTotal: logTotal ?? 0,
		logTotalPages,
		logType,
	};
};
