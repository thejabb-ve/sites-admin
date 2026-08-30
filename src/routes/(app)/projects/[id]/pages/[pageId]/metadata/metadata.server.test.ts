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

// ─── Fixtures ────────────────────────────────────────────────────────────

const PROJECT = { id: 'proj-1', name: 'Test' };
const PAGE = {
	id: 'page-1',
	title: 'Home',
	slug: 'home',
	full_path: '/home',
	status: 'draft',
	seo_title: null,
	seo_description: null,
	robots: 'index, follow',
	og_title: null,
	og_description: null,
	og_image_url: null,
	canonical_url: null,
};

// ─── Mocks de Supabase ────────────────────────────────────────────────────

const mockProjectSingle = mock(() => Promise.resolve({ data: PROJECT, error: null }));
const mockPageSingle    = mock(() => Promise.resolve({ data: PAGE, error: null }));
const mockUpdate        = mock(() => Promise.resolve({ error: null }));

let capturedUpdatePayload: unknown = null;

function makeSupabase() {
	return {
		from: (table: string) => {
			if (table === 'projects') {
				return { select: () => ({ eq: () => ({ single: mockProjectSingle }) }) };
			}
			// table === 'pages'
			return {
				select: () => ({
					eq: () => ({
						eq: () => ({ single: mockPageSingle }),
					}),
				}),
				update: (data: unknown) => {
					capturedUpdatePayload = data;
					return {
						eq: () => ({
							eq: () => mockUpdate(),
						}),
					};
				},
			};
		},
	};
}

// ─── Import dinámico después de los mocks ────────────────────────────────

const { actions, load } = await import('./+page.server');

// ─── Helpers ────────────────────────────────────────────────────────────

function makeFormData(fields: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.append(k, v);
	return fd;
}

function makeLocals() {
	return { supabase: makeSupabase() };
}

beforeEach(() => {
	capturedUpdatePayload = null;
	mockProjectSingle.mockReset();
	mockProjectSingle.mockResolvedValue({ data: PROJECT, error: null } as never);
	mockPageSingle.mockReset();
	mockPageSingle.mockResolvedValue({ data: PAGE, error: null } as never);
	mockUpdate.mockReset();
	mockUpdate.mockResolvedValue({ error: null } as never);
});

// ─── load ──────────────────────────────────────────────────────────────────

describe('load — metadata de página', () => {
	it('devuelve proyecto y página', async () => {
		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1', pageId: 'page-1' },
		} as never) as Record<string, unknown>;

		expect(result['project']).toEqual(PROJECT);
		expect(result['page']).toEqual(PAGE);
	});

	it('lanza 404 cuando la página no existe', async () => {
		mockPageSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await expect(
			load({ locals: makeLocals() as never, params: { id: 'proj-1', pageId: 'xxx' } } as never),
		).rejects.toMatchObject({ status: 404 });
	});

	it('lanza 404 cuando el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);
		await expect(
			load({ locals: makeLocals() as never, params: { id: 'xxx', pageId: 'page-1' } } as never),
		).rejects.toMatchObject({ status: 404 });
	});
});

// ─── actions.save ────────────────────────────────────────────────────────────

describe('actions.save', () => {
	it('devuelve 400 cuando robots no es un valor válido', async () => {
		const form = makeFormData({ robots: 'algo-invalido' });
		const result = await actions.save({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 500 cuando Supabase falla al guardar', async () => {
		mockUpdate.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({ robots: 'index, follow' });
		const result = await actions.save({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('guarda los metadatos correctamente con campos opcionales vacíos convertidos a null', async () => {
		const form = makeFormData({
			seo_title:       '',
			seo_description: '',
			robots:          'index, follow',
			og_title:        '',
			og_description:  '',
			og_image_url:    '',
			canonical_url:   '',
		});
		const result = await actions.save({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toEqual({ success: true });
		expect(capturedUpdatePayload).toMatchObject({
			seo_title:       null,
			seo_description: null,
			robots:          'index, follow',
			og_title:        null,
			og_description:  null,
			og_image_url:    null,
			canonical_url:   null,
		});
	});

	it('guarda los metadatos con todos los campos completos', async () => {
		const form = makeFormData({
			seo_title:       'Título SEO',
			seo_description: 'Descripción SEO',
			robots:          'noindex, nofollow',
			og_title:        'Título OG',
			og_description:  'Descripción OG',
			og_image_url:    'https://cdn.test/og.jpg',
			canonical_url:   'https://misitio.com/home',
		});
		const result = await actions.save({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toEqual({ success: true });
		expect(capturedUpdatePayload).toMatchObject({
			seo_title:       'Título SEO',
			seo_description: 'Descripción SEO',
			robots:          'noindex, nofollow',
			og_title:        'Título OG',
			og_description:  'Descripción OG',
			og_image_url:    'https://cdn.test/og.jpg',
			canonical_url:   'https://misitio.com/home',
		});
	});

	it('usa "index, follow" por defecto cuando no se envía robots', async () => {
		const form = makeFormData({});
		const result = await actions.save({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(result).toEqual({ success: true });
		expect(capturedUpdatePayload).toMatchObject({ robots: 'index, follow' });
	});

	it('recorta espacios en los campos de texto', async () => {
		const form = makeFormData({
			seo_title: '  Con espacios  ',
			robots:    'index, follow',
		});
		await actions.save({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1', pageId: 'page-1' },
		} as never);

		expect(capturedUpdatePayload).toMatchObject({ seo_title: 'Con espacios' });
	});
});
