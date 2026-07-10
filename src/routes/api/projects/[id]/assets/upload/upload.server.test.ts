import { describe, it, expect, mock, beforeEach, afterEach } from 'bun:test';

// ─── Mocks de módulos (deben declararse antes del import dinámico) ────────────

mock.module('$env/static/private', () => ({
	CDN_WORKER_URL: 'https://cdn.test',
	CDN_UPLOAD_SECRET: 'test-secret',
	SUPABASE_SERVICE_ROLE_KEY: 'svc-key',
}));
mock.module('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL: 'https://supabase.test',
}));

let capturedWaitUntil: Promise<void> | null = null;
mock.module('@vercel/functions', () => ({
	waitUntil: (p: Promise<void>) => { capturedWaitUntil = p; },
}));

mock.module('$lib/audit', () => ({ logAudit: async () => {} }));

const mockToBuffer = mock(() => Promise.resolve(Buffer.from('fake-webp')));
mock.module('sharp', () => ({
	default: () => ({
		webp:   () => ({ toBuffer: mockToBuffer }),
		resize: () => ({ webp: () => ({ toBuffer: mockToBuffer }) }),
	}),
}));

// ─── Import dinámico tras mocks ───────────────────────────────────────────────

const { POST } = await import('./+server');

// ─── Helpers ─────────────────────────────────────────────────────────────────

type FetchArgs = { url: string; init: RequestInit };
let fetchCalls: FetchArgs[] = [];
let fetchQueue: Response[] = [];
const originalFetch = globalThis.fetch;

function queueFetch(...responses: Response[]) {
	fetchQueue.push(...responses);
}

function ok(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

const CDN_OK   = () => ok({ url: 'https://cdn.test/projects/1/uuid.jpg', key: 'projects/1/uuid.jpg' });
const CDN_VARIANT = () => ok({ url: 'https://cdn.test/projects/1/var.webp', key: 'projects/1/var.webp' });
const SUPA_OK  = () => new Response(null, { status: 204 });

const INSERTED_ASSET = {
	id: 'asset-1',
	key: 'projects/1/uuid.jpg',
	url: 'https://cdn.test/projects/1/uuid.jpg',
	filename: 'foto.jpg',
	mime_type: 'image/jpeg',
	size_bytes: 1024,
	thumb_url: null,
	created_at: '2026-07-09T00:00:00Z',
};

function makeFileMock(opts?: {
	name?: string;
	type?: string;
	size?: number;
	content?: string;
}): File {
	const content = opts?.content ?? 'fake-content';
	const ab = new TextEncoder().encode(content).buffer as ArrayBuffer;
	return {
		name: opts?.name ?? 'foto.jpg',
		type: opts?.type ?? 'image/jpeg',
		size: opts?.size ?? content.length,
		arrayBuffer: () => Promise.resolve(ab),
	} as unknown as File;
}

const mockProjectSingle = mock(() => Promise.resolve({ data: { id: 'proj-1' }, error: null }));
const mockInsertSingle  = mock(() => Promise.resolve({ data: INSERTED_ASSET, error: null }));

function makeSupabase() {
	return {
		from: (table: string) => {
			if (table === 'projects') {
				return { select: () => ({ eq: () => ({ single: mockProjectSingle }) }) };
			}
			return { insert: () => ({ select: () => ({ single: mockInsertSingle }) }) };
		},
	};
}

function makeLocals(user: object | null = { id: 'user-1' }) {
	return {
		safeGetSession: () => Promise.resolve({ user, session: null }),
		supabase: makeSupabase(),
	};
}

// Usa un FormData simulado para evitar que Happy-dom convierta el mock a string
function makeFakeFormData(file: File | undefined): { get: (k: string) => unknown } {
	return { get: (k: string) => (k === 'file' ? file ?? null : null) };
}

function makeEvent(opts?: {
	file?: File | null | undefined;
	projectId?: string;
	user?: object | null;
}): Parameters<typeof POST>[0] {
	const { file, projectId = 'proj-1', user = { id: 'user-1' } } = opts ?? {};

	// file=null → simular formData que falla; file=undefined → sin campo file; file=File → con archivo
	const formDataFn = file === null
		? () => Promise.reject(new Error('bad form'))
		: () => Promise.resolve(makeFakeFormData(file));

	return {
		params: { id: projectId },
		locals: makeLocals(user) as never,
		request: { formData: formDataFn },
	} as never;
}

// ─── Setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
	fetchCalls = [];
	fetchQueue = [];
	capturedWaitUntil = null;
	mockToBuffer.mockClear();
	mockProjectSingle.mockReset();
	mockInsertSingle.mockReset();
	mockProjectSingle.mockResolvedValue({ data: { id: 'proj-1' }, error: null } as never);
	mockInsertSingle.mockResolvedValue({ data: INSERTED_ASSET, error: null } as never);

	globalThis.fetch = (async (url: string, init?: RequestInit) => {
		fetchCalls.push({ url, init: init ?? {} });
		const next = fetchQueue.shift();
		return next ?? CDN_OK();
	}) as typeof fetch;
});

afterEach(() => {
	globalThis.fetch = originalFetch;
});

// ─── Autenticación ────────────────────────────────────────────────────────────

describe('POST /assets/upload — autenticación', () => {
	it('devuelve 401 cuando no hay sesión', async () => {
		const res = await POST(makeEvent({ user: null }));
		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.error).toMatch(/autenticado/i);
	});

	it('devuelve 404 cuando el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: null } as never);
		const res = await POST(makeEvent({ file: makeFileMock() }));
		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.error).toMatch(/proyecto/i);
	});
});

// ─── Validación de archivo ────────────────────────────────────────────────────

describe('POST /assets/upload — validación de archivo', () => {
	it('devuelve 400 cuando no se envía campo file', async () => {
		const res = await POST(makeEvent({ file: undefined }));
		expect(res.status).toBe(400);
		expect((await res.json()).error).toMatch(/file/i);
	});

	it('devuelve 400 cuando el formData es inválido', async () => {
		const res = await POST(makeEvent({ file: null }));
		expect(res.status).toBe(400);
	});

	it('devuelve 400 para tipo SVG', async () => {
		const res = await POST(makeEvent({ file: makeFileMock({ type: 'image/svg+xml' }) }));
		expect(res.status).toBe(400);
		expect((await res.json()).error).toMatch(/admitido/i);
	});

	it('devuelve 400 para tipo GIF', async () => {
		const res = await POST(makeEvent({ file: makeFileMock({ type: 'image/gif' }) }));
		expect(res.status).toBe(400);
	});

	it('devuelve 400 para tipo texto plano', async () => {
		const res = await POST(makeEvent({ file: makeFileMock({ type: 'text/plain' }) }));
		expect(res.status).toBe(400);
	});

	it('acepta image/jpeg', async () => {
		queueFetch(CDN_OK());
		const res = await POST(makeEvent({ file: makeFileMock({ type: 'image/jpeg' }) }));
		expect(res.status).toBe(201);
	});

	it('acepta image/png', async () => {
		queueFetch(CDN_OK());
		const res = await POST(makeEvent({ file: makeFileMock({ type: 'image/png' }) }));
		expect(res.status).toBe(201);
	});

	it('acepta image/webp', async () => {
		queueFetch(CDN_OK());
		const res = await POST(makeEvent({ file: makeFileMock({ type: 'image/webp' }) }));
		expect(res.status).toBe(201);
	});

	it('acepta video/mp4 sin procesar con sharp', async () => {
		queueFetch(CDN_OK());
		const res = await POST(makeEvent({ file: makeFileMock({ name: 'vid.mp4', type: 'video/mp4' }) }));
		expect(res.status).toBe(201);
		expect(capturedWaitUntil).toBeNull(); // sin fase 2
	});

	it('acepta video/quicktime', async () => {
		queueFetch(CDN_OK());
		const res = await POST(makeEvent({ file: makeFileMock({ name: 'clip.mov', type: 'video/quicktime' }) }));
		expect(res.status).toBe(201);
		expect(capturedWaitUntil).toBeNull();
	});

	it('acepta application/pdf sin sharp', async () => {
		queueFetch(CDN_OK());
		const res = await POST(makeEvent({ file: makeFileMock({ name: 'doc.pdf', type: 'application/pdf' }) }));
		expect(res.status).toBe(201);
		expect(capturedWaitUntil).toBeNull();
	});

	it('devuelve 400 cuando el archivo supera 200 MB', async () => {
		const bigFile = makeFileMock({ size: 201 * 1024 * 1024 });
		const res = await POST(makeEvent({ file: bigFile }));
		expect(res.status).toBe(400);
		expect((await res.json()).error).toMatch(/200/);
	});
});

// ─── Errores del CDN ─────────────────────────────────────────────────────────

describe('POST /assets/upload — errores de CDN', () => {
	it('devuelve 502 cuando el CDN responde con error HTTP', async () => {
		queueFetch(new Response('Service Unavailable', { status: 503 }));
		const res = await POST(makeEvent({ file: makeFileMock() }));
		expect(res.status).toBe(502);
		expect((await res.json()).error).toMatch(/CDN/i);
	});

	it('devuelve 502 cuando el CDN responde 200 con body no-JSON', async () => {
		queueFetch(new Response('Internal Server Error', { status: 200 }));
		const res = await POST(makeEvent({ file: makeFileMock() }));
		expect(res.status).toBe(502);
	});

	it('devuelve 502 cuando el CDN responde JSON sin url ni key', async () => {
		queueFetch(ok({ message: 'ok' }));
		const res = await POST(makeEvent({ file: makeFileMock() }));
		expect(res.status).toBe(502);
	});

	it('devuelve 502 cuando el CDN responde con objeto vacío {}', async () => {
		queueFetch(ok({}));
		const res = await POST(makeEvent({ file: makeFileMock() }));
		expect(res.status).toBe(502);
	});
});

// ─── Errores de Supabase ──────────────────────────────────────────────────────

describe('POST /assets/upload — errores de Supabase', () => {
	it('devuelve 500 cuando Supabase insert falla', async () => {
		mockInsertSingle.mockResolvedValueOnce({
			data: null,
			error: { message: 'violates not-null constraint' },
		} as never);
		queueFetch(CDN_OK());
		const res = await POST(makeEvent({ file: makeFileMock() }));
		expect(res.status).toBe(500);
		expect((await res.json()).error).toMatch(/registrando/i);
	});

	it('devuelve 500 cuando Supabase insert devuelve data null sin error', async () => {
		mockInsertSingle.mockResolvedValueOnce({ data: null, error: null } as never);
		queueFetch(CDN_OK());
		const res = await POST(makeEvent({ file: makeFileMock() }));
		expect(res.status).toBe(500);
	});
});

// ─── Flujo exitoso ────────────────────────────────────────────────────────────

describe('POST /assets/upload — flujo exitoso', () => {
	it('devuelve 201 con el asset insertado', async () => {
		queueFetch(CDN_OK());
		const res = await POST(makeEvent({ file: makeFileMock() }));
		expect(res.status).toBe(201);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.asset.id).toBe('asset-1');
	});

	it('llama al CDN con Authorization Bearer correcta', async () => {
		queueFetch(CDN_OK());
		await POST(makeEvent({ file: makeFileMock() }));
		const cdnCall = fetchCalls[0];
		expect(cdnCall.init.headers).toMatchObject({
			Authorization: 'Bearer test-secret',
		});
	});

	it('llama al CDN con X-Skip-Register: true', async () => {
		queueFetch(CDN_OK());
		await POST(makeEvent({ file: makeFileMock() }));
		expect(fetchCalls[0].init.headers).toMatchObject({ 'X-Skip-Register': 'true' });
	});

	it('llama al CDN con X-Project-Id correcto', async () => {
		queueFetch(CDN_OK());
		await POST(makeEvent({ file: makeFileMock(), projectId: 'proj-99' }));
		expect(fetchCalls[0].init.headers).toMatchObject({ 'X-Project-Id': 'proj-99' });
	});

	it('inserta en Supabase con original_key igual al key inicial', async () => {
		let insertedData: unknown;
		mockInsertSingle.mockImplementationOnce((() => {}) as never); // para capturar
		// Spy sobre el insert
		const spyInsert = mock(() => ({
			select: () => ({
				single: () => Promise.resolve({ data: INSERTED_ASSET, error: null }),
			}),
		}));
		const locals = {
			safeGetSession: () => Promise.resolve({ user: { id: 'u-1' }, session: null }),
			supabase: {
				from: (table: string) => {
					if (table === 'projects') {
						return { select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { id: 'proj-1' } }) }) }) };
					}
					return {
						insert: (data: unknown) => {
							insertedData = data;
							return { select: () => ({ single: () => Promise.resolve({ data: INSERTED_ASSET, error: null }) }) };
						},
					};
				},
			},
		};
		queueFetch(CDN_OK());
		await POST({
			params: { id: 'proj-1' },
			locals: locals as never,
			request: { formData: () => Promise.resolve(makeFakeFormData(makeFileMock())) },
		} as never);

		void spyInsert;
		const data = insertedData as Record<string, unknown>;
		expect(data.key).toBe(data.original_key);
		expect(data.url).toBe(data.original_url);
		expect(data.is_public).toBe(true);
	});

	it('no llama waitUntil para PDFs', async () => {
		queueFetch(CDN_OK());
		await POST(makeEvent({ file: makeFileMock({ name: 'doc.pdf', type: 'application/pdf' }) }));
		expect(capturedWaitUntil).toBeNull();
	});

	it('llama waitUntil solo para imágenes procesables', async () => {
		queueFetch(CDN_OK());
		await POST(makeEvent({ file: makeFileMock({ type: 'image/jpeg' }) }));
		expect(capturedWaitUntil).not.toBeNull();
	});
});

// ─── Fase 2 — background Sharp ───────────────────────────────────────────────

describe('POST /assets/upload — fase 2 (background)', () => {
	async function uploadAndWait(file = makeFileMock()) {
		queueFetch(CDN_OK(), CDN_VARIANT(), CDN_VARIANT(), CDN_VARIANT(), SUPA_OK());
		await POST(makeEvent({ file }));
		await capturedWaitUntil;
	}

	it('llama a Sharp 3 veces (full, cluster, thumb)', async () => {
		await uploadAndWait();
		// mockToBuffer se usa en webp() y en resize().webp(), 3 veces en total
		expect(mockToBuffer).toHaveBeenCalledTimes(3);
	});

	it('sube las 3 variantes al CDN con Content-Type image/webp', async () => {
		await uploadAndWait();
		const variantCalls = fetchCalls.slice(1, 4);
		for (const call of variantCalls) {
			expect(call.init.headers).toMatchObject({ 'Content-Type': 'image/webp' });
		}
	});

	it('sube variante full con filename {baseName}.webp', async () => {
		await uploadAndWait(makeFileMock({ name: 'foto.jpg' }));
		const fullCall = fetchCalls[1];
		expect(fullCall.init.headers).toMatchObject({ 'X-Filename': 'foto.webp' });
	});

	it('sube variante cluster con filename {baseName}_cluster.webp', async () => {
		await uploadAndWait(makeFileMock({ name: 'foto.jpg' }));
		expect(fetchCalls[2].init.headers).toMatchObject({ 'X-Filename': 'foto_cluster.webp' });
	});

	it('sube variante thumb con filename {baseName}_thumb.webp', async () => {
		await uploadAndWait(makeFileMock({ name: 'foto.jpg' }));
		expect(fetchCalls[3].init.headers).toMatchObject({ 'X-Filename': 'foto_thumb.webp' });
	});

	it('hace PATCH a Supabase con los 4 keys tras las variantes', async () => {
		await uploadAndWait();
		const patchCall = fetchCalls[4];
		expect(patchCall.url).toContain('/rest/v1/assets?id=eq.asset-1');
		expect(patchCall.init.method).toBe('PATCH');
		const patchBody = JSON.parse(patchCall.init.body as string);
		expect(patchBody).toMatchObject({
			key: expect.any(String),
			url: expect.any(String),
			cluster_key: expect.any(String),
			cluster_url: expect.any(String),
			thumb_key: expect.any(String),
			thumb_url: expect.any(String),
		});
	});

	it('usa Authorization Bearer de SUPABASE_SERVICE_ROLE_KEY para el PATCH', async () => {
		await uploadAndWait();
		const patchCall = fetchCalls[4];
		expect(patchCall.init.headers).toMatchObject({
			Authorization: 'Bearer svc-key',
		});
	});

	it('no hace PATCH si alguna variante falla en el CDN', async () => {
		queueFetch(CDN_OK(), CDN_VARIANT(), new Response('fail', { status: 500 }), CDN_VARIANT());
		await POST(makeEvent({ file: makeFileMock() }));
		await capturedWaitUntil;
		// solo 4 calls: original + 3 variantes (sin PATCH)
		expect(fetchCalls).toHaveLength(4);
	});

	it('captura errores de Sharp sin tirar el proceso', async () => {
		mockToBuffer.mockRejectedValueOnce(new Error('Corrupt image data'));
		queueFetch(CDN_OK());
		const res = await POST(makeEvent({ file: makeFileMock() }));
		// Fase 1 debe tener éxito
		expect(res.status).toBe(201);
		// El background no debe lanzar
		await expect(capturedWaitUntil).resolves.toBeUndefined();
	});

	it('maneja graciosamente nombres de archivo sin extensión', async () => {
		queueFetch(CDN_OK(), CDN_VARIANT(), CDN_VARIANT(), CDN_VARIANT(), SUPA_OK());
		const file = makeFileMock({ name: 'sinextension' });
		await POST(makeEvent({ file }));
		await capturedWaitUntil;
		// baseName = 'sinextension' → variantes con nombre correcto
		expect(fetchCalls[1].init.headers).toMatchObject({ 'X-Filename': 'sinextension.webp' });
	});

	it('maneja nombres con múltiples puntos correctamente', async () => {
		queueFetch(CDN_OK(), CDN_VARIANT(), CDN_VARIANT(), CDN_VARIANT(), SUPA_OK());
		await POST(makeEvent({ file: makeFileMock({ name: 'foto.grande.jpg' }) }));
		await capturedWaitUntil;
		expect(fetchCalls[1].init.headers).toMatchObject({ 'X-Filename': 'foto.grande.webp' });
	});
});
