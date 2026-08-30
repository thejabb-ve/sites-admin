import { describe, it, expect, mock, beforeEach } from 'bun:test';
import * as sveltekit from '@sveltejs/kit';

// ─── Mocks de SvelteKit ────────────────────────────────────────────────────

mock.module('@sveltejs/kit', () => ({
	...sveltekit,
	error: (status: number, msg: string) => { throw Object.assign(new Error(msg), { status }); },
	fail:  (status: number, data: unknown) => ({ type: 'failure' as const, status, data }),
}));

// ─── Mock de logProjectAudit ───────────────────────────────────────────────

const mockLogProjectAudit = mock(() => Promise.resolve());

mock.module('$lib/audit', () => ({
	logProjectAudit: (...args: unknown[]) => (mockLogProjectAudit as unknown as (...a: unknown[]) => unknown)(...args),
}));

// ─── Supabase mock ────────────────────────────────────────────────────────

const mockProjectSingle = mock(() => Promise.resolve({ data: null, error: { message: 'not found' } }));
const mockUpdateEq      = mock(() => Promise.resolve({ error: null }));

function makeSupabase() {
	return {
		from: (table: string) => ({
			select: () => ({
				eq: () => ({
					single: mockProjectSingle,
				}),
			}),
			update: (data: unknown) => ({
				eq: (col: string, val: unknown) => (mockUpdateEq as unknown as (...a: unknown[]) => unknown)(table, data, col, val),
			}),
		}),
	};
}

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

// ─── Import dinámico después de los mocks ────────────────────────────────

const { actions, load } = await import('./+page.server');

// ─── Fixtures ────────────────────────────────────────────────────────────

const BASE_PROJECT = { id: 'proj-1', name: 'Test', header_props: { links: [] } };

const VALID_HEADER_PROPS = {
	logo:     'https://cdn.example.com/logo.png',
	logoDark: '',
	links:    [{ label: 'Inicio', href: '/' }],
	ctaLabel: 'Contacto',
	ctaHref:  '/contacto',
};

// ─── load ──────────────────────────────────────────────────────────────────

describe('load — header', () => {
	beforeEach(() => {
		mockProjectSingle.mockReset();
		mockProjectSingle.mockResolvedValue({ data: BASE_PROJECT, error: null } as never);
	});

	it('devuelve el proyecto con header_props en el caso feliz', async () => {
		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1' },
		} as never) as Record<string, unknown>;

		expect(result['project']).toEqual(BASE_PROJECT);
	});

	it('lanza 404 cuando el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);

		await expect(
			load({ locals: makeLocals() as never, params: { id: 'xxx' } } as never),
		).rejects.toMatchObject({ status: 404 });
	});
});

// ─── actions.save ───────────────────────────────────────────────────────────

describe('actions.save — header', () => {
	beforeEach(() => {
		mockUpdateEq.mockReset();
		mockUpdateEq.mockResolvedValue({ error: null } as never);
		mockLogProjectAudit.mockReset();
		mockLogProjectAudit.mockResolvedValue(undefined as never);
	});

	it('devuelve 400 cuando el JSON de props es inválido', async () => {
		const form = makeFormData({ props: 'esto-no-es-json' });
		const result = await actions.save({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
		expect(mockUpdateEq).not.toHaveBeenCalled();
	});

	it('devuelve 400 cuando las props no cumplen el schema', async () => {
		const bad = { ...VALID_HEADER_PROPS, links: [{ label: 'Sin href' }] };
		const form = makeFormData({ props: JSON.stringify(bad) });
		const result = await actions.save({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 500 cuando Supabase falla al actualizar', async () => {
		mockUpdateEq.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({ props: JSON.stringify(VALID_HEADER_PROPS) });
		const result = await actions.save({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('guarda header_props válidas y registra auditoría', async () => {
		const form = makeFormData({ props: JSON.stringify(VALID_HEADER_PROPS) });
		const result = await actions.save({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toEqual({ success: true });
		expect(mockUpdateEq).toHaveBeenCalledTimes(1);
		const [table, data, col, val] = mockUpdateEq.mock.calls[0] as unknown[];
		expect(table).toBe('projects');
		expect(data).toMatchObject({ header_props: expect.objectContaining({ ctaLabel: 'Contacto' }) });
		expect(col).toBe('id');
		expect(val).toBe('proj-1');

		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
		const auditArgs = mockLogProjectAudit.mock.calls[0] as unknown[];
		expect(auditArgs[1]).toBe('proj-1');
		expect(auditArgs[2]).toMatchObject({ action: 'update', resourceType: 'template', changed: ['header_props'] });
	});
});
