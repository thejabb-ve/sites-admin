import { describe, it, expect, mock, beforeEach } from 'bun:test';
import * as sveltekit from '@sveltejs/kit';

// ─── Mocks de SvelteKit ────────────────────────────────────────────────────
// Se preserva el resto del módulo real (json, error, ...) para no romper
// otros test files que importan @sveltejs/kit en la misma corrida de `bun test src`.

mock.module('@sveltejs/kit', () => ({
	...sveltekit,
	redirect: (status: number, location: string) => {
		throw Object.assign(new Error('redirect'), { status, location });
	},
}));

// ─── Import dinámico después de los mocks ────────────────────────────────

const { POST } = await import('./+server');

// ─── Mocks de locals ────────────────────────────────────────────────────

const mockSignOut = mock(() => Promise.resolve({ error: null }));
const mockCookieDelete = mock((_name: string, _opts: unknown) => {});

function makeLocals() {
	return {
		supabase: {
			auth: { signOut: mockSignOut },
		},
	};
}

function makeCookies() {
	return { delete: mockCookieDelete };
}

beforeEach(() => {
	mockSignOut.mockReset();
	mockSignOut.mockResolvedValue({ error: null } as never);
	mockCookieDelete.mockReset();
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe('POST /api/auth/signout', () => {
	it('llama a supabase.auth.signOut()', async () => {
		try {
			await POST({ locals: makeLocals() as never, cookies: makeCookies() as never } as never);
		} catch {
			// el redirect lanza; lo que nos interesa es que signOut se haya llamado antes
		}
		expect(mockSignOut).toHaveBeenCalledTimes(1);
	});

	it('borra la cookie cdn_token con path "/"', async () => {
		try {
			await POST({ locals: makeLocals() as never, cookies: makeCookies() as never } as never);
		} catch {
			// idem
		}
		expect(mockCookieDelete).toHaveBeenCalledWith('cdn_token', { path: '/' });
	});

	it('redirige a /login con status 302 tras cerrar sesión', async () => {
		await expect(
			POST({ locals: makeLocals() as never, cookies: makeCookies() as never } as never)
		).rejects.toMatchObject({ status: 302, location: '/login' });
	});

	it('redirige a /login incluso cuando no había sesión activa (signOut sin error)', async () => {
		mockSignOut.mockResolvedValueOnce({ error: null } as never);

		await expect(
			POST({ locals: makeLocals() as never, cookies: makeCookies() as never } as never)
		).rejects.toMatchObject({ status: 302, location: '/login' });
	});

	it('redirige a /login aunque signOut() devuelva un error (no se maneja explícitamente)', async () => {
		mockSignOut.mockResolvedValueOnce({ error: { message: 'session not found' } } as never);

		await expect(
			POST({ locals: makeLocals() as never, cookies: makeCookies() as never } as never)
		).rejects.toMatchObject({ status: 302, location: '/login' });
	});
});
