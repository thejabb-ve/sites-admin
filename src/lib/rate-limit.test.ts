import { describe, it, expect, mock, beforeEach } from 'bun:test';

// rate-limit.ts crea su propio cliente Supabase con createClient() a nivel de módulo
// (no es inyectable como en audit.ts), así que hay que mockear '@supabase/supabase-js'
// ANTES de importar el módulo bajo prueba.

interface QueryResult {
	count: number | null;
	error: unknown;
}

let selectResult: QueryResult = { count: 0, error: null };
let insertResult: { error: unknown } = { error: null };
let deleteResult: { error: unknown } = { error: null };

const calls: { method: string; args: unknown[] }[] = [];

function makeBuilder() {
	const builder = {
		select: (...args: unknown[]) => {
			calls.push({ method: 'select', args });
			return builder;
		},
		eq: (...args: unknown[]) => {
			calls.push({ method: 'eq', args });
			return builder;
		},
		gte: (...args: unknown[]) => {
			calls.push({ method: 'gte', args });
			return builder;
		},
		lt: (...args: unknown[]) => {
			calls.push({ method: 'lt', args });
			return Promise.resolve(deleteResult);
		},
		delete: (...args: unknown[]) => {
			calls.push({ method: 'delete', args });
			return builder;
		},
		insert: (...args: unknown[]) => {
			calls.push({ method: 'insert', args });
			return Promise.resolve(insertResult);
		},
		// select(...).eq(...).eq(...).gte(...) termina llamando explícitamente a .then(cb)
		// en rate-limit.ts, así que basta con que `then` sea una función normal (no hace
		// falta que sea un thenable nativo para ese camino). También sirve como thenable
		// real para el camino delete/lt (que se await-ea directamente sobre `builder`,
		// aunque ahí `lt` ya devuelve una Promise real, con lo cual este `then` no se usa).
		then: (onFulfilled: (r: QueryResult) => unknown) => Promise.resolve(selectResult).then(onFulfilled),
	};
	return builder;
}

const mockFrom = mock((table: string) => {
	calls.push({ method: 'from', args: [table] });
	return makeBuilder();
});

mock.module('@supabase/supabase-js', () => ({
	createClient: () => ({ from: mockFrom }),
}));

const { checkRateLimit, recordAttempt, purgeOldAttempts } = await import('./rate-limit');

beforeEach(() => {
	calls.length = 0;
	selectResult = { count: 0, error: null };
	insertResult = { error: null };
	deleteResult = { error: null };
	mockFrom.mockClear();
});

describe('checkRateLimit', () => {
	it('permite la petición cuando count está por debajo del máximo (10)', async () => {
		selectResult = { count: 5, error: null };
		const result = await checkRateLimit('1.2.3.4');
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(5);
	});

	it('permite la petición número 9 (count=9, el límite exacto -1)', async () => {
		selectResult = { count: 9, error: null };
		const result = await checkRateLimit('1.2.3.4');
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(1);
	});

	it('bloquea exactamente al llegar a MAX_ATTEMPTS=10', async () => {
		selectResult = { count: 10, error: null };
		const result = await checkRateLimit('1.2.3.4');
		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
	});

	it('bloquea y no deja remaining negativo cuando count supera el máximo', async () => {
		selectResult = { count: 15, error: null };
		const result = await checkRateLimit('1.2.3.4');
		expect(result.allowed).toBe(false);
		expect(result.remaining).toBe(0);
	});

	it('trata count=null (posible con head:true) como 0 intentos', async () => {
		selectResult = { count: null, error: null };
		const result = await checkRateLimit('1.2.3.4');
		expect(result.allowed).toBe(true);
		expect(result.remaining).toBe(10);
	});

	it('consulta la tabla login_attempts', async () => {
		await checkRateLimit('1.2.3.4');
		expect(mockFrom).toHaveBeenCalledWith('login_attempts');
	});

	it('filtra por la ip exacta pasada (aislamiento entre keys)', async () => {
		await checkRateLimit('9.9.9.9');
		const eqCalls = calls.filter((c) => c.method === 'eq');
		expect(eqCalls.some((c) => c.args[0] === 'ip' && c.args[1] === '9.9.9.9')).toBe(true);
	});

	it('filtra también por succeeded=false (solo cuenta intentos fallidos)', async () => {
		await checkRateLimit('1.2.3.4');
		const eqCalls = calls.filter((c) => c.method === 'eq');
		expect(eqCalls.some((c) => c.args[0] === 'succeeded' && c.args[1] === false)).toBe(true);
	});

	it('llamadas consecutivas con ips distintas no comparten estado entre sí (cada .eq usa su propia ip)', async () => {
		await checkRateLimit('1.1.1.1');
		const ipsUsedFirst = calls.filter((c) => c.method === 'eq' && c.args[0] === 'ip').map((c) => c.args[1]);

		calls.length = 0;
		await checkRateLimit('2.2.2.2');
		const ipsUsedSecond = calls.filter((c) => c.method === 'eq' && c.args[0] === 'ip').map((c) => c.args[1]);

		expect(ipsUsedFirst).toEqual(['1.1.1.1']);
		expect(ipsUsedSecond).toEqual(['2.2.2.2']);
	});
});

describe('recordAttempt', () => {
	it('inserta un intento fallido con ip y succeeded=false', async () => {
		await recordAttempt('1.2.3.4', false);
		const insertCall = calls.find((c) => c.method === 'insert');
		expect(insertCall?.args[0]).toEqual({ ip: '1.2.3.4', succeeded: false });
	});

	it('inserta un intento exitoso con succeeded=true', async () => {
		await recordAttempt('1.2.3.4', true);
		const insertCall = calls.find((c) => c.method === 'insert');
		expect(insertCall?.args[0]).toEqual({ ip: '1.2.3.4', succeeded: true });
	});

	it('opera sobre la tabla login_attempts', async () => {
		await recordAttempt('1.2.3.4', false);
		expect(mockFrom).toHaveBeenCalledWith('login_attempts');
	});

	it('no lanza si Supabase devuelve error en el insert', async () => {
		insertResult = { error: { message: 'boom' } };
		await expect(recordAttempt('1.2.3.4', false)).resolves.toBeUndefined();
	});
});

describe('purgeOldAttempts', () => {
	it('elimina intentos de más de 1 hora para la ip dada', async () => {
		await purgeOldAttempts('1.2.3.4');

		const deleteCall = calls.find((c) => c.method === 'delete');
		expect(deleteCall).toBeDefined();

		const eqCall = calls.find((c) => c.method === 'eq' && c.args[0] === 'ip');
		expect(eqCall?.args[1]).toBe('1.2.3.4');

		const ltCall = calls.find((c) => c.method === 'lt');
		expect(ltCall?.args[0]).toBe('attempted_at');
	});

	it('el corte de tiempo pasado a lt() es ~1 hora atrás', async () => {
		const before = Date.now() - 60 * 60 * 1000;
		await purgeOldAttempts('1.2.3.4');
		const after = Date.now() - 60 * 60 * 1000;

		const ltCall = calls.find((c) => c.method === 'lt');
		const cutoff = new Date(ltCall?.args[1] as string).getTime();

		expect(cutoff).toBeGreaterThanOrEqual(before - 1000);
		expect(cutoff).toBeLessThanOrEqual(after + 1000);
	});

	it('no lanza si Supabase devuelve error en el delete', async () => {
		deleteResult = { error: { message: 'boom' } };
		await expect(purgeOldAttempts('1.2.3.4')).resolves.toBeUndefined();
	});
});
