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

// ─── Mock de logProjectAudit ────────────────────────────────────────────────
// Evita depender de safeGetSession()/insert real; solo verificamos que se llame.

const mockLogProjectAudit = mock(() => Promise.resolve());
mock.module('$lib/audit', () => ({
	logProjectAudit: mockLogProjectAudit,
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────

const PROJECT = {
	id: 'proj-1',
	name: 'Proyecto Test',
	ga4_id: null,
	site_name: 'Mi Sitio',
	title_separator: ' | ',
	default_robots: 'index, follow',
	canonical_domain: null,
	twitter_handle: null,
};

const BRAND = { favicon_url: null, og_image_url: null };

// ─── Mocks de Supabase ────────────────────────────────────────────────────

const mockProjectSingle = mock(() => Promise.resolve({ data: PROJECT, error: null }));
const mockBrandSingle   = mock(() => Promise.resolve({ data: BRAND, error: null }));
const mockProjectsUpdate = mock(() => Promise.resolve({ error: null }));
const mockBrandUpdate    = mock(() => Promise.resolve({ error: null }));

function makeSupabase() {
	return {
		from: (table: string) => {
			if (table === 'projects') {
				return {
					select: () => ({ eq: () => ({ single: mockProjectSingle }) }),
					update: (data: unknown) => ({ eq: (_col: string, val: unknown) => (mockProjectsUpdate as unknown as (...a: unknown[]) => unknown)(data, val) }),
				};
			}
			if (table === 'brand_manuals') {
				return {
					select: () => ({ eq: () => ({ single: mockBrandSingle }) }),
					update: (data: unknown) => ({ eq: (_col: string, val: unknown) => (mockBrandUpdate as unknown as (...a: unknown[]) => unknown)(data, val) }),
				};
			}
			throw new Error(`Tabla no mockeada: ${table}`);
		},
	};
}

function makeLocals() {
	return {
		supabase: makeSupabase(),
		safeGetSession: () => Promise.resolve({ user: { id: 'user-1', email: 'test@test.com' }, session: null }),
	};
}

function makeFormData(fields: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.append(k, v);
	return fd;
}

// ─── Import dinámico después de los mocks ────────────────────────────────

const { load, actions } = await import('./+page.server');

// ─── Setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
	mockProjectSingle.mockReset();
	mockBrandSingle.mockReset();
	mockProjectsUpdate.mockReset();
	mockBrandUpdate.mockReset();
	mockLogProjectAudit.mockReset();

	mockProjectSingle.mockResolvedValue({ data: PROJECT, error: null } as never);
	mockBrandSingle.mockResolvedValue({ data: BRAND, error: null } as never);
	mockProjectsUpdate.mockResolvedValue({ error: null } as never);
	mockBrandUpdate.mockResolvedValue({ error: null } as never);
	mockLogProjectAudit.mockResolvedValue(undefined as never);
});

// ─── load ─────────────────────────────────────────────────────────────────

describe('load settings', () => {
	it('lanza 404 cuando el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await expect(
			load({ locals: makeLocals() as never, params: { id: 'proj-1' } } as never)
		).rejects.toMatchObject({ status: 404 });
	});

	it('devuelve project y brand', async () => {
		const result = await load({ locals: makeLocals() as never, params: { id: 'proj-1' } } as never) as any;
		expect(result.project).toMatchObject({ id: 'proj-1', name: 'Proyecto Test' });
		expect(result.brand).toEqual(BRAND);
	});
});

// ─── actions.saveGa4 ────────────────────────────────────────────────────────

describe('actions.saveGa4', () => {
	it('devuelve 400 cuando el formato del GA4 ID es inválido', async () => {
		const form = makeFormData({ ga4_id: 'invalid-id' });
		const result = await actions.saveGa4({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400, data: { field: 'ga4' } });
	});

	it('acepta ga4_id vacío (null)', async () => {
		const form = makeFormData({ ga4_id: '' });
		const result = await actions.saveGa4({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toEqual({ success: 'ga4' });
	});

	it('devuelve 500 cuando Supabase falla al actualizar', async () => {
		mockProjectsUpdate.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({ ga4_id: 'G-ABC1234' });
		const result = await actions.saveGa4({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500, data: { field: 'ga4' } });
	});

	it('guarda un ga4_id válido y registra auditoría', async () => {
		const form = makeFormData({ ga4_id: 'G-ABC1234' });
		const result = await actions.saveGa4({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toEqual({ success: 'ga4' });
		expect(mockProjectsUpdate).toHaveBeenCalledTimes(1);
		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});
});

// ─── actions.saveSiteConfig ──────────────────────────────────────────────────

describe('actions.saveSiteConfig', () => {
	it('devuelve 400 cuando default_robots no es un valor válido', async () => {
		const form = makeFormData({
			site_name: 'Mi Sitio',
			title_separator: ' | ',
			default_robots: 'valor-invalido',
			canonical_domain: '',
			twitter_handle: '',
		});
		const result = await actions.saveSiteConfig({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400, data: { field: 'site' } });
	});

	it('devuelve 400 cuando canonical_domain no es una URL válida', async () => {
		const form = makeFormData({
			site_name: 'Mi Sitio',
			title_separator: ' | ',
			default_robots: 'index, follow',
			canonical_domain: 'no-es-una-url',
			twitter_handle: '',
		});
		const result = await actions.saveSiteConfig({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400, data: { field: 'site' } });
	});

	it('devuelve 500 cuando Supabase falla al actualizar', async () => {
		mockProjectsUpdate.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({
			site_name: 'Mi Sitio',
			title_separator: ' | ',
			default_robots: 'index, follow',
			canonical_domain: '',
			twitter_handle: '',
		});
		const result = await actions.saveSiteConfig({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500, data: { field: 'site' } });
	});

	it('guarda la configuración del sitio con datos válidos y registra auditoría', async () => {
		const form = makeFormData({
			site_name: 'Mi Sitio',
			title_separator: ' — ',
			default_robots: 'noindex, follow',
			canonical_domain: 'https://misitio.com',
			twitter_handle: '@misitio',
		});
		const result = await actions.saveSiteConfig({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toEqual({ success: 'site' });
		expect(mockProjectsUpdate).toHaveBeenCalledTimes(1);
		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});

	it('usa title_separator por defecto (" | ") cuando no se envía', async () => {
		let saved: unknown;
		mockProjectsUpdate.mockImplementationOnce(((data: unknown) => {
			saved = data;
			return Promise.resolve({ error: null });
		}) as never);

		const form = makeFormData({
			site_name: 'Mi Sitio',
			default_robots: 'index, follow',
			canonical_domain: '',
			twitter_handle: '',
		});
		await actions.saveSiteConfig({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(saved).toMatchObject({ title_separator: ' | ' });
	});
});

// ─── actions.saveAssets ──────────────────────────────────────────────────────

describe('actions.saveAssets', () => {
	it('devuelve 500 cuando Supabase falla al actualizar', async () => {
		mockBrandUpdate.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({ favicon_url: 'https://cdn.test/favicon.ico', og_image_url: '' });
		const result = await actions.saveAssets({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500, data: { field: 'assets' } });
	});

	it('guarda favicon_url y og_image_url y registra auditoría', async () => {
		let saved: unknown;
		mockBrandUpdate.mockImplementationOnce(((data: unknown) => {
			saved = data;
			return Promise.resolve({ error: null });
		}) as never);

		const form = makeFormData({
			favicon_url: 'https://cdn.test/favicon.ico',
			og_image_url: 'https://cdn.test/og.png',
		});
		const result = await actions.saveAssets({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toEqual({ success: 'assets' });
		expect(saved).toMatchObject({ favicon_url: 'https://cdn.test/favicon.ico', og_image_url: 'https://cdn.test/og.png' });
		expect(mockLogProjectAudit).toHaveBeenCalledTimes(1);
	});

	it('guarda null cuando los campos vienen vacíos', async () => {
		let saved: unknown;
		mockBrandUpdate.mockImplementationOnce(((data: unknown) => {
			saved = data;
			return Promise.resolve({ error: null });
		}) as never);

		const form = makeFormData({ favicon_url: '', og_image_url: '' });
		await actions.saveAssets({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(saved).toMatchObject({ favicon_url: null, og_image_url: null });
	});
});
