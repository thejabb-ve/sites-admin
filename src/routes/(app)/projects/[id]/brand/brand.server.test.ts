import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ─── Mocks de SvelteKit ────────────────────────────────────────────────────

mock.module('@sveltejs/kit', () => ({
	error: (status: number, msg: string) => { throw Object.assign(new Error(msg), { status }); },
	fail:  (status: number, data: unknown) => ({ type: 'failure' as const, status, data }),
}));

// ─── Supabase mock ────────────────────────────────────────────────────────

const mockProjectSingle  = mock(() => Promise.resolve({ data: null, error: { message: 'not found' } }));
const mockManualSingle   = mock(() => Promise.resolve({ data: null, error: null }));
const mockDomainsQuery   = mock(() => Promise.resolve({ data: [], error: null }));
const mockUpsert         = mock(() => Promise.resolve({ error: null }));

function makeSupabase() {
	return {
		from: (table: string) => ({
			select: () => ({
				eq: () => ({
					single:                  table === 'projects' ? mockProjectSingle : mockManualSingle,
					order: () => ({
						order: () => mockDomainsQuery(),
					}),
				}),
			}),
			upsert: (data: unknown, opts: unknown) => (mockUpsert as unknown as (...a: unknown[]) => unknown)(data, opts),
		}),
	};
}

// ─── Import dinámico después de los mocks ────────────────────────────────

const { actions, load } = await import('./+page.server');

// ─── Fixtures ────────────────────────────────────────────────────────────

const BASE_PROJECT = { id: 'proj-1', name: 'Test', canonical_domain: null };

const VALID_DRAFT = {
	colors: {
		primary:        'oklch(0.5 0.15 250)',
		primary_fg:     'oklch(1 0 0)',
		primary_hover:  'oklch(0.45 0.15 250)',
		primary_active: 'oklch(0.4 0.15 250)',
		accent:         'oklch(0.55 0.18 300)',
		accent_fg:      'oklch(1 0 0)',
		accent_hover:   'oklch(0.5 0.18 300)',
		background:     'oklch(1 0 0)',
		surface:        'oklch(0.97 0 0)',
		text:           'oklch(0.15 0 0)',
		text_muted:     'oklch(0.5 0 0)',
		border:         'oklch(0.88 0 0)',
		success:        'oklch(0.55 0.15 145)',
		warning:        'oklch(0.65 0.18 75)',
		error:          'oklch(0.55 0.2 25)',
		link:           'oklch(0.5 0.15 250)',
		link_hover:     'oklch(0.4 0.15 250)',
	},
	colors_dark: {},
	typography: {
		display: { family: 'Inter', weights: [400, 700], source: 'google' },
		body:    { family: 'Inter', weights: [400],      source: 'google' },
	},
	radii:   { none: '0px', sm: '4px', md: '6px', lg: '8px', xl: '12px', full: '9999px' },
	shadows: { sm: '0 1px 2px oklch(0 0 0 / 0.05)', md: 'none', lg: 'none', xl: 'none' },
	spacing: { scale: 1 },
	layout:  { max_width_content: '1280px', max_width_prose: '720px' },
	legal_info: {},
	custom_css: null,
};

function makeFormData(fields: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.append(k, v);
	return fd;
}

function makeLocals() {
	return { supabase: makeSupabase() };
}

// ─── saveDraft ────────────────────────────────────────────────────────────

describe('actions.saveDraft', () => {
	beforeEach(() => {
		mockUpsert.mockReset();
		mockUpsert.mockResolvedValue({ error: null });
	});

	it('devuelve 400 cuando body no es JSON válido', async () => {
		const form = makeFormData({ draft: 'esto-no-es-json' });
		const result = await actions.saveDraft({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando falta el campo colors', async () => {
		const bad = { ...VALID_DRAFT, colors: undefined };
		const form = makeFormData({ draft: JSON.stringify(bad) });
		const result = await actions.saveDraft({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando un color no tiene formato oklch', async () => {
		const bad = {
			...VALID_DRAFT,
			colors: { ...VALID_DRAFT.colors, primary: '#ff0000' },
		};
		const form = makeFormData({ draft: JSON.stringify(bad) });
		const result = await actions.saveDraft({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando typography.display.source no es enum válido', async () => {
		const bad = {
			...VALID_DRAFT,
			typography: {
				display: { family: 'Inter', weights: [400], source: 'remote' },
				body:    VALID_DRAFT.typography.body,
			},
		};
		const form = makeFormData({ draft: JSON.stringify(bad) });
		const result = await actions.saveDraft({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('rechaza payload con inyección XSS en un color', async () => {
		const bad = {
			...VALID_DRAFT,
			colors: { ...VALID_DRAFT.colors, primary: 'oklch(</style><script>alert(1)</script>' },
		};
		const form = makeFormData({ draft: JSON.stringify(bad) });
		const result = await actions.saveDraft({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		// oklch( seguido de contenido no numérico falla el regex de oklchSchema
		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 500 cuando Supabase falla al hacer upsert', async () => {
		mockUpsert.mockResolvedValueOnce({ error: { message: 'connection error' } } as never);
		const form = makeFormData({ draft: JSON.stringify(VALID_DRAFT) });
		const result = await actions.saveDraft({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('devuelve success:draft con payload válido', async () => {
		const form = makeFormData({ draft: JSON.stringify(VALID_DRAFT) });
		const result = await actions.saveDraft({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toEqual({ success: 'draft' });
		expect(mockUpsert).toHaveBeenCalledTimes(1);
	});

	it('guarda draft_overrides (no los campos raíz) en Supabase', async () => {
		let saved: unknown;
		mockUpsert.mockImplementationOnce(((data: unknown) => {
			saved = data;
			return Promise.resolve({ error: null });
		}) as never);

		const form = makeFormData({ draft: JSON.stringify(VALID_DRAFT) });
		await actions.saveDraft({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(saved).toMatchObject({ project_id: 'proj-1', draft_overrides: expect.objectContaining({ colors: expect.any(Object) }) });
		expect(saved).not.toHaveProperty('colors');
	});

	it('acepta legal_info con todos los campos fiscales', async () => {
		const draft = {
			...VALID_DRAFT,
			legal_info: {
				legal_name:    'ACME S.A.',
				tax_id:        'RFC123456',
				business_type: 'Tecnología',
				postal_code:   '06600',
				city:          'Ciudad de México',
				state:         'CDMX',
				country:       'México',
				email:         'legal@acme.mx',
				phone:         '+52 55 1234 5678',
				address:       'Av. Reforma 100',
			},
		};
		const form = makeFormData({ draft: JSON.stringify(draft) });
		const result = await actions.saveDraft({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toEqual({ success: 'draft' });
	});
});

// ─── publish ──────────────────────────────────────────────────────────────

describe('actions.publish', () => {
	beforeEach(() => {
		mockUpsert.mockReset();
		mockUpsert.mockResolvedValue({ error: null });
	});

	it('devuelve 400 cuando body no es JSON válido', async () => {
		const form = makeFormData({ manual: '{invalid', version: '1' });
		const result = await actions.publish({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 500 cuando Supabase falla al publicar', async () => {
		mockUpsert.mockResolvedValueOnce({ error: { message: 'db error' } } as never);
		const form = makeFormData({ manual: JSON.stringify(VALID_DRAFT), version: '2' });
		const result = await actions.publish({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toMatchObject({ type: 'failure', status: 500 });
	});

	it('publica con version incrementada y borra draft_overrides', async () => {
		let saved: unknown;
		mockUpsert.mockImplementationOnce(((data: unknown) => {
			saved = data;
			return Promise.resolve({ error: null });
		}) as never);

		const form = makeFormData({ manual: JSON.stringify(VALID_DRAFT), version: '3' });
		const result = await actions.publish({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(result).toEqual({ success: 'published' });
		expect(saved).toMatchObject({
			project_id:     'proj-1',
			version:        4,
			draft_overrides: null,
			colors:         expect.any(Object),
		});
	});

	it('versión 0 se incrementa a 1 cuando version es NaN', async () => {
		let saved: unknown;
		mockUpsert.mockImplementationOnce(((data: unknown) => {
			saved = data;
			return Promise.resolve({ error: null });
		}) as never);

		const form = makeFormData({ manual: JSON.stringify(VALID_DRAFT), version: 'NaN' });
		await actions.publish({
			request: { formData: () => Promise.resolve(form) } as never,
			locals:  makeLocals() as never,
			params:  { id: 'proj-1' },
		} as never);

		expect(saved).toMatchObject({ version: 1 });
	});
});

// ─── load — previewUrl ────────────────────────────────────────────────────

describe('load — previewUrl', () => {
	beforeEach(() => {
		mockProjectSingle.mockReset();
		mockManualSingle.mockReset();
		mockDomainsQuery.mockReset();
		mockProjectSingle.mockResolvedValue({ data: BASE_PROJECT, error: null } as never);
		mockManualSingle.mockResolvedValue({ data: null, error: null } as never);
		mockDomainsQuery.mockResolvedValue({ data: [], error: null } as never);
	});

	it('devuelve null cuando el proyecto no tiene dominio ni canonical_domain', async () => {
		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1' },
		} as never) as Record<string, unknown>;

		expect(result['previewUrl']).toBeNull();
	});

	it('devuelve null cuando el dominio activo es localhost', async () => {
		mockDomainsQuery.mockResolvedValueOnce({ data: [{ domain: 'localhost:5173', is_active: true }], error: null } as never);
		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1' },
		} as never) as Record<string, unknown>;

		expect(result['previewUrl']).toBeNull();
	});

	it('devuelve null cuando canonical_domain apunta a 127.0.0.1', async () => {
		mockProjectSingle.mockResolvedValueOnce({
			data: { ...BASE_PROJECT, canonical_domain: 'http://127.0.0.1:3000' },
			error: null,
		} as never);
		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1' },
		} as never) as Record<string, unknown>;

		expect(result['previewUrl']).toBeNull();
	});

	it('devuelve URL cuando hay dominio activo real', async () => {
		mockDomainsQuery.mockResolvedValueOnce({ data: [{ domain: 'cliente.com', is_active: true }], error: null } as never);
		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1' },
		} as never) as Record<string, unknown>;

		expect(result['previewUrl']).toBe('https://cliente.com');
	});

	it('devuelve canonical_domain cuando no hay dominios activos', async () => {
		mockProjectSingle.mockResolvedValueOnce({
			data: { ...BASE_PROJECT, canonical_domain: 'https://misitio.com' },
			error: null,
		} as never);
		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1' },
		} as never) as Record<string, unknown>;

		expect(result['previewUrl']).toBe('https://misitio.com');
	});

	it('lanza 404 cuando el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

		await expect(
			load({ locals: makeLocals() as never, params: { id: 'xxx' } } as never)
		).rejects.toMatchObject({ status: 404 });
	});
});
