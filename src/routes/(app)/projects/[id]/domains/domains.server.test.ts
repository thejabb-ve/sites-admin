import { describe, it, expect, mock, beforeEach } from 'bun:test';
import * as sveltekit from '@sveltejs/kit';

// ─── Mocks de SvelteKit ────────────────────────────────────────────────────

mock.module('@sveltejs/kit', () => ({
	...sveltekit,
	error: (status: number, msg: string) => { throw Object.assign(new Error(msg), { status }); },
}));

// ─── Supabase mock ────────────────────────────────────────────────────────

const mockProjectSingle = mock(() => Promise.resolve({ data: null, error: { message: 'not found' } }));
const mockDomainsOrder  = mock(() => Promise.resolve({ data: [], error: null }));

function makeSupabase() {
	return {
		from: (table: string) => {
			if (table === 'projects') {
				return {
					select: () => ({
						eq: () => ({
							single: mockProjectSingle,
						}),
					}),
				};
			}
			// domains
			return {
				select: () => ({
					eq: () => ({
						order: () => mockDomainsOrder(),
					}),
				}),
			};
		},
	};
}

function makeLocals() {
	return { supabase: makeSupabase() };
}

// ─── Import dinámico después de los mocks ────────────────────────────────

const { load } = await import('./+page.server');

// ─── Fixtures ────────────────────────────────────────────────────────────

const BASE_PROJECT = { id: 'proj-1', name: 'Test' };

describe('load — domains', () => {
	beforeEach(() => {
		mockProjectSingle.mockReset();
		mockDomainsOrder.mockReset();
		mockProjectSingle.mockResolvedValue({ data: BASE_PROJECT, error: null } as never);
		mockDomainsOrder.mockResolvedValue({ data: [], error: null } as never);
	});

	it('devuelve el proyecto y la lista de dominios en el caso feliz', async () => {
		const domains = [
			{ id: 'dom-1', domain: 'cliente.com', is_active: true, status: 'active', error_message: null, cf_zone_id: 'zone-1', vercel_domain_id: 'vc-1', dns_verified_at: '2026-01-01', created_at: '2026-01-01' },
		];
		mockDomainsOrder.mockResolvedValueOnce({ data: domains, error: null } as never);

		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1' },
		} as never) as Record<string, unknown>;

		expect(result['project']).toEqual(BASE_PROJECT);
		expect(result['domains']).toEqual(domains);
	});

	it('devuelve un array vacío cuando el proyecto no tiene dominios', async () => {
		mockDomainsOrder.mockResolvedValueOnce({ data: null, error: null } as never);

		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1' },
		} as never) as Record<string, unknown>;

		expect(result['domains']).toEqual([]);
	});

	it('lanza 404 cuando el proyecto no existe', async () => {
		mockProjectSingle.mockResolvedValueOnce({ data: null, error: { message: 'not found' } } as never);

		await expect(
			load({ locals: makeLocals() as never, params: { id: 'xxx' } } as never),
		).rejects.toMatchObject({ status: 404 });
	});

	it('devuelve un array vacío cuando Supabase falla al leer dominios (sin lanzar)', async () => {
		mockDomainsOrder.mockResolvedValueOnce({ data: null, error: { message: 'db error' } } as never);

		const result = await load({
			locals: makeLocals() as never,
			params: { id: 'proj-1' },
		} as never) as Record<string, unknown>;

		expect(result['project']).toEqual(BASE_PROJECT);
		expect(result['domains']).toEqual([]);
	});
});
