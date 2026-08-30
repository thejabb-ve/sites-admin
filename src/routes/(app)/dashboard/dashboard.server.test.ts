import { describe, it, expect, mock, beforeEach } from 'bun:test';

// ─── Mocks de Supabase ────────────────────────────────────────────────────

const mockProjectsOrder = mock(() => Promise.resolve({ data: [], error: null }));

function makeSupabase() {
	return {
		from: () => ({
			select: () => ({
				order: () => mockProjectsOrder(),
			}),
		}),
	};
}

function makeLocals() {
	return { supabase: makeSupabase() };
}

// ─── Import dinámico ──────────────────────────────────────────────────────

const { load } = await import('./+page.server');

// ─── Fixtures ─────────────────────────────────────────────────────────────

const PROJECTS = [
	{ id: 'proj-2', name: 'Proyecto B', created_at: '2026-02-01T00:00:00Z' },
	{ id: 'proj-1', name: 'Proyecto A', created_at: '2026-01-01T00:00:00Z' },
];

beforeEach(() => {
	mockProjectsOrder.mockReset();
	mockProjectsOrder.mockResolvedValue({ data: PROJECTS, error: null } as never);
});

// ─── Tests ────────────────────────────────────────────────────────────────

describe('load dashboard', () => {
	it('devuelve la lista de proyectos del usuario', async () => {
		const result = await load({ locals: makeLocals() as never } as never) as Record<string, unknown>;
		expect(result['projects']).toEqual(PROJECTS);
	});

	it('devuelve array vacío cuando Supabase no devuelve proyectos', async () => {
		mockProjectsOrder.mockResolvedValueOnce({ data: null, error: null } as never);
		const result = await load({ locals: makeLocals() as never } as never) as Record<string, unknown>;
		expect(result['projects']).toEqual([]);
	});

	it('devuelve array vacío cuando el usuario no tiene proyectos (RLS filtra todo)', async () => {
		mockProjectsOrder.mockResolvedValueOnce({ data: [], error: null } as never);
		const result = await load({ locals: makeLocals() as never } as never) as Record<string, unknown>;
		expect(result['projects']).toEqual([]);
	});

	it('devuelve array vacío cuando Supabase falla, sin lanzar', async () => {
		mockProjectsOrder.mockResolvedValueOnce({ data: null, error: { message: 'connection error' } } as never);
		const result = await load({ locals: makeLocals() as never } as never) as Record<string, unknown>;
		expect(result['projects']).toEqual([]);
	});
});
