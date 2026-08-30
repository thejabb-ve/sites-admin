import { describe, it, expect, mock, beforeEach } from 'bun:test';
import * as sveltekit from '@sveltejs/kit';

// ─── Mocks de SvelteKit ────────────────────────────────────────────────────
// Se preserva el resto del módulo real (json, error, ...) para no romper
// otros test files que importan @sveltejs/kit en la misma corrida de `bun test src`.

mock.module('@sveltejs/kit', () => ({
	...sveltekit,
	fail: (status: number, data: unknown) => ({ type: 'failure' as const, status, data }),
	redirect: (status: number, location: string) => {
		throw Object.assign(new Error('redirect'), { status, location });
	},
}));

// ─── Mock de rate-limit ─────────────────────────────────────────────────────
// Solo verificamos que login.ts invoque estas funciones correctamente; su
// lógica interna (ventanas de tiempo, conteo en Supabase) no se reimplementa aquí.

const mockCheckRateLimit   = mock(() => Promise.resolve({ allowed: true, remaining: 10 }));
const mockRecordAttempt    = mock(() => Promise.resolve());
const mockPurgeOldAttempts = mock(() => Promise.resolve());

mock.module('$lib/rate-limit', () => ({
	checkRateLimit:   mockCheckRateLimit,
	recordAttempt:    mockRecordAttempt,
	purgeOldAttempts: mockPurgeOldAttempts,
}));

// ─── Mock de cdn-token ──────────────────────────────────────────────────────
// signCdnToken firma un JWT real con jose; para el test de login solo nos
// interesa que se invoque con los argumentos correctos, no su implementación.

const mockSignCdnToken = mock(() => Promise.resolve('signed-jwt-token'));

mock.module('$lib/cdn-token', () => ({
	signCdnToken: mockSignCdnToken,
}));

// ─── Import dinámico después de los mocks ────────────────────────────────

const { actions, load } = await import('./+page.server');

// ─── Mocks de Supabase / locals ─────────────────────────────────────────────

const mockSignInWithPassword = mock(() =>
	Promise.resolve({ data: { user: null }, error: { message: 'Invalid credentials' } })
);
const mockMembersEq = mock(() => Promise.resolve({ data: [], error: null }));

function makeSupabase() {
	return {
		auth: { signInWithPassword: mockSignInWithPassword },
		from: (table: string) => {
			if (table === 'project_members') {
				return { select: () => ({ eq: () => mockMembersEq() }) };
			}
			throw new Error(`Tabla no mockeada: ${table}`);
		},
	};
}

const mockCookieSet = mock((_name: string, _value: string, _opts: unknown) => {});

function makeLocals(session: unknown = null) {
	return {
		supabase: makeSupabase(),
		safeGetSession: () => Promise.resolve({ user: session ? { id: 'user-1' } : null, session }),
	};
}

function makeFormData(fields: Record<string, string>): FormData {
	const fd = new FormData();
	for (const [k, v] of Object.entries(fields)) fd.append(k, v);
	return fd;
}

function makeEvent(fields: Record<string, string>, overrides: { locals?: ReturnType<typeof makeLocals> } = {}) {
	return {
		request: { formData: () => Promise.resolve(makeFormData(fields)) },
		locals: overrides.locals ?? makeLocals(),
		cookies: { set: mockCookieSet },
		getClientAddress: () => '1.2.3.4',
	} as never;
}

beforeEach(() => {
	mockCheckRateLimit.mockReset();
	mockCheckRateLimit.mockResolvedValue({ allowed: true, remaining: 10 } as never);
	mockRecordAttempt.mockReset();
	mockRecordAttempt.mockResolvedValue(undefined as never);
	mockPurgeOldAttempts.mockReset();
	mockPurgeOldAttempts.mockResolvedValue(undefined as never);
	mockSignCdnToken.mockReset();
	mockSignCdnToken.mockResolvedValue('signed-jwt-token' as never);
	mockSignInWithPassword.mockReset();
	mockSignInWithPassword.mockResolvedValue({
		data: { user: null },
		error: { message: 'Invalid credentials' },
	} as never);
	mockMembersEq.mockReset();
	mockMembersEq.mockResolvedValue({ data: [], error: null } as never);
	mockCookieSet.mockReset();
});

// ─── load ────────────────────────────────────────────────────────────────

describe('load', () => {
	it('redirige a /dashboard cuando ya hay sesión activa', async () => {
		await expect(
			load({ locals: makeLocals({ access_token: 'tok' }) } as never)
		).rejects.toMatchObject({ status: 302, location: '/dashboard' });
	});

	it('devuelve objeto vacío cuando no hay sesión', async () => {
		const result = await load({ locals: makeLocals(null) } as never);
		expect(result).toEqual({});
	});
});

// ─── actions.default — credenciales inválidas ───────────────────────────────

describe('actions.default — credenciales inválidas', () => {
	it('devuelve 400 cuando falta email o password', async () => {
		const result = await actions.default(makeEvent({ email: '', password: '' }));
		expect(result).toMatchObject({ type: 'failure', status: 400 });
	});

	it('devuelve 400 cuando el honeypot está marcado (bot detectado)', async () => {
		const result = await actions.default(
			makeEvent({ email: 'a@a.com', password: 'x', hp_field: 'on' })
		);
		expect(result).toMatchObject({ type: 'failure', status: 400 });
		expect(mockSignInWithPassword).not.toHaveBeenCalled();
	});

	it('devuelve 401 y registra el intento fallido cuando Supabase rechaza las credenciales', async () => {
		mockSignInWithPassword.mockResolvedValueOnce({
			data: { user: null },
			error: { message: 'Invalid login credentials' },
		} as never);

		const result = await actions.default(makeEvent({ email: 'a@a.com', password: 'mal' }));

		expect(result).toMatchObject({ type: 'failure', status: 401 });
		expect(mockRecordAttempt).toHaveBeenCalledWith('1.2.3.4', false);
	});

	it('incluye el conteo de intentos restantes en el mensaje cuando quedan pocos', async () => {
		mockCheckRateLimit.mockResolvedValueOnce({ allowed: true, remaining: 2 } as never);
		mockSignInWithPassword.mockResolvedValueOnce({
			data: { user: null },
			error: { message: 'Invalid login credentials' },
		} as never);

		const result = await actions.default(makeEvent({ email: 'a@a.com', password: 'mal' }));

		expect((result as { data: { error: string } }).data.error).toContain('2 intentos restantes');
	});

	it('devuelve 429 cuando se supera el rate limit y no llama a Supabase', async () => {
		mockCheckRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0 } as never);

		const result = await actions.default(makeEvent({ email: 'a@a.com', password: 'x' }));

		expect(result).toMatchObject({ type: 'failure', status: 429 });
		expect(mockSignInWithPassword).not.toHaveBeenCalled();
	});
});

// ─── actions.default — credenciales válidas ─────────────────────────────────

describe('actions.default — credenciales válidas', () => {
	it('registra el intento exitoso y purga intentos viejos', async () => {
		mockSignInWithPassword.mockResolvedValueOnce({
			data: { user: { id: 'user-1' } },
			error: null,
		} as never);

		await expect(
			actions.default(makeEvent({ email: 'a@a.com', password: 'bien' }))
		).rejects.toMatchObject({ status: 302, location: '/dashboard' });

		expect(mockRecordAttempt).toHaveBeenCalledWith('1.2.3.4', true);
		expect(mockPurgeOldAttempts).toHaveBeenCalledWith('1.2.3.4');
	});

	it('firma el cdn_token con el userId y los project_ids del usuario', async () => {
		mockSignInWithPassword.mockResolvedValueOnce({
			data: { user: { id: 'user-1' } },
			error: null,
		} as never);
		mockMembersEq.mockResolvedValueOnce({
			data: [{ project_id: 'proj-1' }, { project_id: 'proj-2' }],
			error: null,
		} as never);

		try {
			await actions.default(makeEvent({ email: 'a@a.com', password: 'bien' }));
		} catch {
			// redirect esperado
		}

		expect(mockSignCdnToken).toHaveBeenCalledWith('user-1', ['proj-1', 'proj-2']);
	});

	it('setea la cookie cdn_token httpOnly con el token firmado', async () => {
		mockSignInWithPassword.mockResolvedValueOnce({
			data: { user: { id: 'user-1' } },
			error: null,
		} as never);

		try {
			await actions.default(makeEvent({ email: 'a@a.com', password: 'bien' }));
		} catch {
			// redirect esperado
		}

		expect(mockCookieSet).toHaveBeenCalledWith(
			'cdn_token',
			'signed-jwt-token',
			expect.objectContaining({ path: '/', httpOnly: true, sameSite: 'lax' })
		);
	});

	it('usa array vacío de project_ids cuando el usuario no tiene membresías', async () => {
		mockSignInWithPassword.mockResolvedValueOnce({
			data: { user: { id: 'user-1' } },
			error: null,
		} as never);
		mockMembersEq.mockResolvedValueOnce({ data: null, error: null } as never);

		try {
			await actions.default(makeEvent({ email: 'a@a.com', password: 'bien' }));
		} catch {
			// redirect esperado
		}

		expect(mockSignCdnToken).toHaveBeenCalledWith('user-1', []);
	});

	it('redirige a /dashboard con status 302 tras login exitoso', async () => {
		mockSignInWithPassword.mockResolvedValueOnce({
			data: { user: { id: 'user-1' } },
			error: null,
		} as never);

		await expect(
			actions.default(makeEvent({ email: 'a@a.com', password: 'bien' }))
		).rejects.toMatchObject({ status: 302, location: '/dashboard' });
	});
});
