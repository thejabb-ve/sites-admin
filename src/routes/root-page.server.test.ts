import { describe, it, expect, mock } from 'bun:test';
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

const { load } = await import('./+page.server');

// ─── Tests ────────────────────────────────────────────────────────────────

describe('load raíz ("/")', () => {
	it('redirige a /dashboard con status 302', () => {
		expect(() => load({} as never)).toThrow();

		try {
			load({} as never);
		} catch (e) {
			expect(e).toMatchObject({ status: 302, location: '/dashboard' });
		}
	});
});
