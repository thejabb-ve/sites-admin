import { describe, it, expect, mock, beforeEach } from 'bun:test';
import * as sveltekit from '@sveltejs/kit';

// ─── Mocks de SvelteKit ────────────────────────────────────────────────────
// Se preserva el resto del módulo real (json, redirect, ...) para no romper
// otros test files que importan @sveltejs/kit en la misma corrida de `bun test src`.

mock.module('@sveltejs/kit', () => ({
	...sveltekit,
	error: (status: number, msg: string) => { throw Object.assign(new Error(msg), { status }); },
	fail:  (status: number, data: unknown) => ({ type: 'failure' as const, status, data }),
}));

// ─── Mock de $lib/audit ────────────────────────────────────────────────────

const mockLogProjectAudit = mock(() => Promise.resolve());
mock.module('$lib/audit', () => ({
	logProjectAudit: (...args: unknown[]) => (mockLogProjectAudit as unknown as (...a: unknown[]) => unknown)(...args),
}));

// ─── Supabase mock ────────────────────────────────────────────────────────

const PROJECT = { id: 'proj-1', name: 'Test', default_robots: 'index, follow' };

const mockProjectSingle = mock(() => Promise.resolve({ data: PROJECT, error: null }));
const mockPagesQuery    = mock(() => Promise.resolve({ data: [], error: null }));
const mockInsertSingle  = mock(() => Promise.resolve({ data: { id: 'page-new', full_path: '/nueva' }, error: null }));
const mockUpdate        = mock(() => Promise.resolve({ error: null }));
const mockDeleteSingle  = mock(() => Promise.resolve({ data: { archived_at: '2026-01-01T00:00:00Z', title: 'X', full_path: '/x' }, error: null }));
const mockDelete        = mock(() => Promise.resolve({ error: null }));

function makeSupabase() {
	return {
		from: (table: string) => {
			if (table === 'projects') {
				return { select: () => ({ eq: () => ({ single: mockProjectSingle }) }) };
			}
			// table === 'pages'
			return {
				select: (_cols: string) => ({
					eq: (_col1: string, _val1: unknown) => ({
						order: (_col: string) => ({
							not: () => mockPagesQuery(),
							is:  () => mockPagesQuery(),
						}),
						eq: (_col2: string, _val2: unknown) => ({
							single: mockDeleteSingle,
						}),
						single: mockDeleteSingle,
					}),
				}),
				insert: (_data: unknown) => ({
					select: () => ({
						single: mockInsertSingle,
					}),
				}),
				update: (_data: unknown) => ({
					eq: (_col1: string, _val1: unknown) => ({
						eq: (_col2: string, _val2: unknown) => mockUpdate(),
					}),
				}),
				delete: () => ({
					eq: (_col1: string, _val1: unknown) => ({
						eq: (_col2: string, _val2: unknown) => mockDelete(),
					}),
				}),
			};
		},
	};
}

// ─── Import dinámico después de los mocks ────────────────────────────────

const { actions, load } = await import('./+page.server');

// ─── Fixtures ────────────────────────────────────────────────────────────

function makeFormData(fields: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.append(k, v);
	return fd;
}

function makeLocals() {
	return {
		supabase: makeSupabase(),
		safeGetSession: () => Promise.resolve({ user: { id: 'user-1', email: 'test@test.com' }, session: null }),
	};
}

beforeEach(() => {
	mockLogProjectAudit.mockReset();
	mockLogProjectAudit.mockResolvedValue(undefined);
	mockProjectSingle.mockReset();
	mockProjectSingle.mockResolvedValue({ data: PROJECT, error: null } as never);
	mockPagesQuery.mockReset();
	mockPagesQuery.mockResolvedValue({ data: [], error: null } as never);
	mockInsertSingle.mockReset();
	mockInsertSingle.mockResolvedValue({ data: { id: 'page-new', full_path: '/nueva' }, error: null } as never);
	mockUpdate.mockReset();
	mockUpdate.mockResolvedValue({ error: null } as never);
	mockDeleteSingle.mockReset();
	mockDeleteSingle.mockResolvedValue({ data: { archived_at: '2026-01-01T00:00:00Z', title: 'X', full_path: '/x' }, error: null } as never);
	mockDelete.mockReset();
	mockDelete.mockResolvedValue({ error: null } as never);
});

// ─── load ──────────────────────────────────────────────────────────────────

describe('load — páginas', () => {
	it('devuelve páginas activas por defecto (tab=active)', async () => {
		const PAGES = [{ id: 'p-1', title: 'Home', slug: 'home', full_path: '/home', status: 'published', robots: 'index, follow', created_at: '', updated_at: '', archived_at: null }];
		mockPagesQuery.mockResolvedValueOnce({ data: PAGES, error: null } as never);
		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1' },
			url: new URL('http://x/pages'),
		} as never) as Record<string, unknown>;

		expect(result['tab']).toBe('active');
		expect(result['pages']).toEqual(PAGES);
	});

	it('devuelve páginas archivadas cuando tab=archived', async () => {
		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1' },
			url: new URL('http://x/pages?tab=archived'),
		} as never) as Record<string, unknown>;

		expect(result['tab']).toBe('archived');
	});

	it('devuelve array vacío cuando Supabase no devuelve páginas', async () => {
		mockPagesQuery.mockResolvedValueOnce({ data: null, error: null } as never);
		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1' },
			url: new URL('http://x/pages'),
		} as never) as Record<string, unknown>;

		expect(result['pages']).toEqual([]);
	});

	it('lanza 404 cuando el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await expect(
			load({ locals: makeLocals() as never, params: { id: 'xxx' }, url: new URL('http://x/pages') } as never),
		).rejects.toMatchObject({ status: 404 });
	});
});

// ─── actions.create ─────────────────────────────────────────────────────────

describe('actions.create', () => {
	it('devuelve 400 cuando falta el título', async () => {
		const form = makeFormData({ title: '', slug: 'valido' });
		const result = await actions.create({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando el slug tiene formato inválido', async () => {
		const form = makeFormData({ title: 'Nueva', slug: 'Con Espacios!' });
		const result = await actions.create({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 409 cuando el slug ya existe (código 23505)', async () => {
		mockInsertSingle.mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate' } } as never);
		const form = makeFormData({ title: 'Nueva', slug: 'home' });
		const result = await actions.create({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 409 });
	});

	it('devuelve 500 cuando Supabase falla al crear', async () => {
		mockInsertSingle.mockResolvedValueOnce({ data: null, error: { code: '500', message: 'db error' } } as never);
		const form = makeFormData({ title: 'Nueva', slug: 'nueva' });
		const result = await actions.create({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('crea la página correctamente y registra auditoría', async () => {
		const form = makeFormData({ title: 'Nueva', slug: 'nueva' });
		const result = await actions.create({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toEqual({ success: 'Página creada correctamente.' });
		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});
});

// ─── actions.rename ──────────────────────────────────────────────────────────

describe('actions.rename', () => {
	it('devuelve 400 cuando el título o slug son inválidos', async () => {
		const form = makeFormData({ page_id: 'page-1', title: '', slug: 'valido' });
		const result = await actions.rename({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 409 cuando el slug ya existe', async () => {
		mockUpdate.mockResolvedValueOnce({ error: { code: '23505', message: 'duplicate' } } as never);
		const form = makeFormData({ page_id: 'page-1', title: 'Home', slug: 'home' });
		const result = await actions.rename({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 409 });
	});

	it('devuelve 500 cuando Supabase falla al renombrar', async () => {
		mockUpdate.mockResolvedValueOnce({ error: { code: '500', message: 'db error' } } as never);
		const form = makeFormData({ page_id: 'page-1', title: 'Home', slug: 'home' });
		const result = await actions.rename({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('renombra correctamente y registra auditoría', async () => {
		const form = makeFormData({ page_id: 'page-1', title: 'Home', slug: 'home' });
		const result = await actions.rename({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toBeUndefined();
		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});
});

// ─── actions.togglePublish ───────────────────────────────────────────────────

describe('actions.togglePublish', () => {
	it('devuelve 400 con estado inválido', async () => {
		const form = makeFormData({ page_id: 'page-1', new_status: 'invalido', page_title: 'Home' });
		const result = await actions.togglePublish({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 500 cuando Supabase falla', async () => {
		mockUpdate.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({ page_id: 'page-1', new_status: 'published', page_title: 'Home' });
		const result = await actions.togglePublish({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('publica la página correctamente', async () => {
		const form = makeFormData({ page_id: 'page-1', new_status: 'published', page_title: 'Home' });
		const result = await actions.togglePublish({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toEqual({ success: 'Página publicada.' });
	});

	it('despublica la página correctamente', async () => {
		const form = makeFormData({ page_id: 'page-1', new_status: 'draft', page_title: 'Home' });
		const result = await actions.togglePublish({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toEqual({ success: 'Página despublicada.' });
	});
});

// ─── actions.archive / restore ───────────────────────────────────────────────

describe('actions.archive', () => {
	it('devuelve 500 cuando Supabase falla', async () => {
		mockUpdate.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({ page_id: 'page-1', page_title: 'Home' });
		const result = await actions.archive({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('archiva la página correctamente y registra auditoría', async () => {
		const form = makeFormData({ page_id: 'page-1', page_title: 'Home' });
		const result = await actions.archive({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toEqual({ success: 'Página archivada.' });
		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});
});

describe('actions.restore', () => {
	it('devuelve 500 cuando Supabase falla', async () => {
		mockUpdate.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({ page_id: 'page-1', page_title: 'Home' });
		const result = await actions.restore({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('restaura la página correctamente', async () => {
		const form = makeFormData({ page_id: 'page-1', page_title: 'Home' });
		const result = await actions.restore({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toEqual({ success: 'Página restaurada.' });
	});
});

// ─── actions.deletePage ──────────────────────────────────────────────────────

describe('actions.deletePage', () => {
	it('devuelve 400 cuando la página no está archivada', async () => {
		mockDeleteSingle.mockResolvedValueOnce({ data: { archived_at: null, title: 'Home', full_path: '/home' }, error: null } as never);
		const form = makeFormData({ page_id: 'page-1', page_title: 'Home' });
		const result = await actions.deletePage({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 500 cuando Supabase falla al eliminar', async () => {
		mockDelete.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({ page_id: 'page-1', page_title: 'Home' });
		const result = await actions.deletePage({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('elimina la página archivada correctamente y registra auditoría', async () => {
		const form = makeFormData({ page_id: 'page-1', page_title: 'Home' });
		const result = await actions.deletePage({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toEqual({ success: 'Página eliminada permanentemente.' });
		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});
});
