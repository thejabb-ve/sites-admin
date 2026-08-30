import { describe, it, expect, mock, beforeEach } from 'bun:test';
import * as sveltekit from '@sveltejs/kit';

// ─── Mocks de SvelteKit ────────────────────────────────────────────────────
// Se preserva el resto del módulo real (json, redirect, ...) para no romper
// otros test files que importan @sveltejs/kit en la misma corrida de `bun test src`.

mock.module('@sveltejs/kit', () => ({
	...sveltekit,
	error: (status: number, msg: string) => { throw Object.assign(new Error(msg), { status }); },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────

const PROJECT = { id: 'proj-1', name: 'Proyecto Test', created_at: '2026-01-01T00:00:00Z' };

const DOMAINS = [{ id: 'dom-1', domain: 'cliente.com', is_active: true }];

const RAW_MEMBERS = [
	{ user_id: 'user-1', role_id: 'role-1', created_at: '2026-01-02T00:00:00Z', project_roles: { name: 'Admin' } },
];

const PROFILES = [{ user_id: 'user-1', display_name: 'Ana Admin' }];

const LOGS = [
	{
		id: 'log-1',
		actor: 'ana@test.com',
		action: 'update',
		resource_type: 'page',
		resource_id: 'page-1',
		resource_name: 'Inicio',
		changed: ['title'],
		status: 'ok',
		error_message: null,
		created_at: '2026-01-03T00:00:00Z',
	},
];

// ─── Mocks de Supabase ────────────────────────────────────────────────────

const mockProjectSingle  = mock(() => Promise.resolve({ data: PROJECT, error: null }));
const mockDomainsOrder   = mock(() => Promise.resolve({ data: DOMAINS, error: null }));
const mockMembersOrder   = mock(() => Promise.resolve({ data: RAW_MEMBERS, error: null }));
const mockAuditRange     = mock(() => Promise.resolve({ data: LOGS, count: 1, error: null }));
const mockProfilesIn     = mock(() => Promise.resolve({ data: PROFILES, error: null }));

let capturedAuditEq: string | null = null;

function makeAuditQuery() {
	const query: Record<string, unknown> = {};
	query['eq'] = (col: string, val: string) => {
		if (col === 'resource_type') capturedAuditEq = val;
		return query;
	};
	query['order'] = () => query;
	query['range'] = () => query;
	query['then'] = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
		mockAuditRange().then(resolve, reject);
	return query;
}

function makeSupabase() {
	return {
		from: (table: string) => {
			if (table === 'projects') {
				return { select: () => ({ eq: () => ({ single: mockProjectSingle }) }) };
			}
			if (table === 'domains') {
				return { select: () => ({ eq: () => ({ order: () => mockDomainsOrder() }) }) };
			}
			if (table === 'project_members') {
				return { select: () => ({ eq: () => ({ order: () => mockMembersOrder() }) }) };
			}
			if (table === 'audit_log') {
				return { select: () => ({ eq: () => makeAuditQuery() }) };
			}
			if (table === 'user_profiles') {
				return { select: () => ({ in: () => mockProfilesIn() }) };
			}
			throw new Error(`Tabla no mockeada: ${table}`);
		},
	};
}

function makeLocals() {
	return { supabase: makeSupabase() };
}

function makeEvent(overrides: { searchParams?: Record<string, string> } = {}): Parameters<typeof load>[0] {
	const url = new URL('http://localhost/projects/proj-1');
	for (const [k, v] of Object.entries(overrides.searchParams ?? {})) url.searchParams.set(k, v);
	return {
		locals: makeLocals() as never,
		params: { id: 'proj-1' },
		url,
	} as never;
}

// ─── Import dinámico después de los mocks ────────────────────────────────

const { load } = await import('./+page.server');

// ─── Setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
	capturedAuditEq = null;
	mockProjectSingle.mockReset();
	mockDomainsOrder.mockReset();
	mockMembersOrder.mockReset();
	mockAuditRange.mockReset();
	mockProfilesIn.mockReset();

	mockProjectSingle.mockResolvedValue({ data: PROJECT, error: null } as never);
	mockDomainsOrder.mockResolvedValue({ data: DOMAINS, error: null } as never);
	mockMembersOrder.mockResolvedValue({ data: RAW_MEMBERS, error: null } as never);
	mockAuditRange.mockResolvedValue({ data: LOGS, count: 1, error: null } as never);
	mockProfilesIn.mockResolvedValue({ data: PROFILES, error: null } as never);
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe('load project detail — proyecto', () => {
	it('lanza 404 cuando el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await expect(load(makeEvent())).rejects.toMatchObject({ status: 404 });
	});

	it('devuelve el proyecto correctamente', async () => {
		const result = await load(makeEvent()) as any;
		expect(result.project).toMatchObject({ id: 'proj-1', name: 'Proyecto Test' });
	});
});

describe('load project detail — dominios y miembros', () => {
	it('devuelve los dominios del proyecto', async () => {
		const result = await load(makeEvent()) as any;
		expect(result.domains).toEqual(DOMAINS);
	});

	it('devuelve array vacío de dominios cuando Supabase no devuelve nada', async () => {
		mockDomainsOrder.mockResolvedValueOnce({ data: null, error: null } as never);
		const result = await load(makeEvent()) as any;
		expect(result.domains).toEqual([]);
	});

	it('resuelve display_name de los miembros vía user_profiles', async () => {
		const result = await load(makeEvent()) as any;
		expect(result.members).toEqual([
			{ user_id: 'user-1', display_name: 'Ana Admin', role_name: 'Admin', created_at: '2026-01-02T00:00:00Z' },
		]);
	});

	it('usa el user_id como fallback si no hay perfil', async () => {
		mockProfilesIn.mockResolvedValueOnce({ data: [], error: null } as never);
		const result = await load(makeEvent()) as any;
		expect(result.members[0].display_name).toBe('user-1');
	});

	it('usa "—" como role_name si no hay project_roles', async () => {
		mockMembersOrder.mockResolvedValueOnce({
			data: [{ user_id: 'user-2', role_id: null, created_at: '2026-01-02T00:00:00Z', project_roles: null }],
			error: null,
		} as never);
		mockProfilesIn.mockResolvedValueOnce({ data: [], error: null } as never);
		const result = await load(makeEvent()) as any;
		expect(result.members[0].role_name).toBe('—');
	});

	it('no consulta user_profiles cuando no hay miembros', async () => {
		mockMembersOrder.mockResolvedValueOnce({ data: [], error: null } as never);
		await load(makeEvent());
		expect(mockProfilesIn).not.toHaveBeenCalled();
	});
});

describe('load project detail — audit log', () => {
	it('devuelve los logs paginados con logTotal y logTotalPages', async () => {
		const result = await load(makeEvent()) as any;
		expect(result.logs).toEqual(LOGS);
		expect(result.logTotal).toBe(1);
		expect(result.logTotalPages).toBe(1);
	});

	it('usa page=1 por defecto cuando no hay query param', async () => {
		const result = await load(makeEvent()) as any;
		expect(result.logPage).toBe(1);
	});

	it('respeta el page pasado por query param', async () => {
		const result = await load(makeEvent({ searchParams: { page: '3' } })) as any;
		expect(result.logPage).toBe(3);
	});

	it('usa page=1 cuando el query param es inválido o negativo', async () => {
		const result = await load(makeEvent({ searchParams: { page: '-5' } })) as any;
		expect(result.logPage).toBe(1);
	});

	it('usa type=all por defecto', async () => {
		const result = await load(makeEvent()) as any;
		expect(result.logType).toBe('all');
		expect(capturedAuditEq).toBeNull();
	});

	it('filtra por resource_type cuando se pasa type', async () => {
		const result = await load(makeEvent({ searchParams: { type: 'page' } })) as any;
		expect(result.logType).toBe('page');
		expect(capturedAuditEq).toBe('page');
	});

	it('devuelve array vacío y logTotal 0 cuando no hay logs', async () => {
		mockAuditRange.mockResolvedValueOnce({ data: null, count: null, error: null } as never);
		const result = await load(makeEvent()) as any;
		expect(result.logs).toEqual([]);
		expect(result.logTotal).toBe(0);
		expect(result.logTotalPages).toBe(0);
	});
});
