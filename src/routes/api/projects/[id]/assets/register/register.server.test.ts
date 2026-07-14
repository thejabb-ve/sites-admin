import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ─── Mocks de módulos ────────────────────────────────────────────────────────

const { POST } = await import('./+server');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ASSET = {
	id:         'asset-99',
	key:        'projects/proj-1/video.mp4',
	url:        'https://cdn.test/projects/proj-1/video.mp4',
	filename:   'clip.mp4',
	mime_type:  'video/mp4',
	size_bytes: 10485760,
	thumb_url:  null,
	created_at: '2026-07-09T12:00:00Z',
};

const VALID_BODY = {
	key:        'projects/proj-1/video.mp4',
	url:        'https://cdn.test/projects/proj-1/video.mp4',
	filename:   'clip.mp4',
	size_bytes: 10485760,
	mime_type:  'video/mp4',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mockInsertSingle = mock(() => Promise.resolve({ data: ASSET, error: null }));

function makeSupabase() {
	return {
		from: () => ({
			insert: () => ({
				select: () => ({
					single: mockInsertSingle,
				}),
			}),
		}),
	};
}

function makeRequest(body: unknown = VALID_BODY) {
	return new Request('https://admin.test/api/projects/proj-1/assets/register', {
		method:  'POST',
		headers: { 'Content-Type': 'application/json' },
		body:    JSON.stringify(body),
	});
}

function makeEvent(opts?: {
	projectId?: string;
	user?: object | null;
	body?: unknown;
}): Parameters<typeof POST>[0] {
	const { projectId = 'proj-1', user = { id: 'user-1' }, body = VALID_BODY } = opts ?? {};
	return {
		request: makeRequest(body),
		params:  { id: projectId },
		locals:  {
			safeGetSession: () => Promise.resolve({ user, session: null }),
			supabase:       makeSupabase(),
		},
	} as never;
}

beforeEach(() => {
	mockInsertSingle.mockReset();
	mockInsertSingle.mockResolvedValue({ data: ASSET, error: null } as never);
});

// ─── Autenticación ────────────────────────────────────────────────────────────

describe('POST /assets/register — autenticación', () => {
	it('devuelve 401 sin sesión', async () => {
		const res = await POST(makeEvent({ user: null }));
		expect(res.status).toBe(401);
		expect((await res.json()).error).toMatch(/autenticado/i);
	});

	it('no inserta en Supabase si el usuario no está autenticado', async () => {
		await POST(makeEvent({ user: null }));
		expect(mockInsertSingle).not.toHaveBeenCalled();
	});
});

// ─── Validación del body ──────────────────────────────────────────────────────

describe('POST /assets/register — validación', () => {
	it('devuelve 400 si falta key', async () => {
		const { key: _, ...rest } = VALID_BODY;
		const res = await POST(makeEvent({ body: rest }));
		expect(res.status).toBe(400);
		expect((await res.json()).error).toMatch(/requerid/i);
	});

	it('devuelve 400 si falta url', async () => {
		const { url: _, ...rest } = VALID_BODY;
		const res = await POST(makeEvent({ body: rest }));
		expect(res.status).toBe(400);
	});

	it('devuelve 400 si falta filename', async () => {
		const { filename: _, ...rest } = VALID_BODY;
		const res = await POST(makeEvent({ body: rest }));
		expect(res.status).toBe(400);
	});

	it('devuelve 400 si el body no es JSON válido', async () => {
		const event = {
			...makeEvent(),
			request: new Request('https://admin.test/', {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    'not-json',
			}),
		} as never;
		const res = await POST(event);
		expect(res.status).toBe(400);
		expect((await res.json()).error).toMatch(/inválido/i);
	});
});

// ─── Inserción en Supabase ────────────────────────────────────────────────────

describe('POST /assets/register — Supabase', () => {
	it('devuelve 201 con el asset insertado en éxito', async () => {
		const res  = await POST(makeEvent());
		const body = await res.json() as { ok: boolean; asset: typeof ASSET };
		expect(res.status).toBe(201);
		expect(body.ok).toBe(true);
		expect(body.asset.id).toBe('asset-99');
	});

	it('devuelve 500 cuando Supabase falla al insertar', async () => {
		mockInsertSingle.mockResolvedValueOnce({ data: null, error: { message: 'RLS violation' } } as never);
		const res = await POST(makeEvent());
		expect(res.status).toBe(500);
		expect((await res.json()).error).toMatch(/registrando/i);
	});

	it('usa "video/mp4" como mime_type por defecto si no se envía', async () => {
		const { mime_type: _, ...rest } = VALID_BODY;
		let capturedInsert: unknown;
		const supabase = {
			from: () => ({
				insert: (data: unknown) => {
					capturedInsert = data;
					return { select: () => ({ single: () => Promise.resolve({ data: ASSET, error: null }) }) };
				},
			}),
		};
		const event = {
			...makeEvent({ body: rest }),
			locals: {
				safeGetSession: () => Promise.resolve({ user: { id: 'u1' }, session: null }),
				supabase,
			},
		} as never;
		await POST(event);
		expect((capturedInsert as Record<string, unknown>).mime_type).toBe('video/mp4');
	});

	it('usa 0 como size_bytes por defecto si no se envía', async () => {
		const { size_bytes: _, ...rest } = VALID_BODY;
		let capturedInsert: unknown;
		const supabase = {
			from: () => ({
				insert: (data: unknown) => {
					capturedInsert = data;
					return { select: () => ({ single: () => Promise.resolve({ data: ASSET, error: null }) }) };
				},
			}),
		};
		const event = {
			...makeEvent({ body: rest }),
			locals: {
				safeGetSession: () => Promise.resolve({ user: { id: 'u1' }, session: null }),
				supabase,
			},
		} as never;
		await POST(event);
		expect((capturedInsert as Record<string, unknown>).size_bytes).toBe(0);
	});

	it('inserta original_key y original_url iguales a key y url', async () => {
		let capturedInsert: unknown;
		const supabase = {
			from: () => ({
				insert: (data: unknown) => {
					capturedInsert = data;
					return { select: () => ({ single: () => Promise.resolve({ data: ASSET, error: null }) }) };
				},
			}),
		};
		const event = {
			...makeEvent(),
			locals: {
				safeGetSession: () => Promise.resolve({ user: { id: 'u1' }, session: null }),
				supabase,
			},
		} as never;
		await POST(event);
		const row = capturedInsert as Record<string, unknown>;
		expect(row.original_key).toBe(row.key);
		expect(row.original_url).toBe(row.url);
	});

	it('inserta con project_id del param, no del body', async () => {
		let capturedInsert: unknown;
		const supabase = {
			from: () => ({
				insert: (data: unknown) => {
					capturedInsert = data;
					return { select: () => ({ single: () => Promise.resolve({ data: ASSET, error: null }) }) };
				},
			}),
		};
		const event = {
			...makeEvent({ projectId: 'proj-42' }),
			locals: {
				safeGetSession: () => Promise.resolve({ user: { id: 'u1' }, session: null }),
				supabase,
			},
		} as never;
		await POST(event);
		expect((capturedInsert as Record<string, unknown>).project_id).toBe('proj-42');
	});
});
