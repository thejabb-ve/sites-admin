import { describe, it, expect, mock } from 'bun:test';
import { pollUntil } from './poll';

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// `bun test --parallel` corre cada archivo en su propio worker process compitiendo
// por los mismos núcleos de CPU — con intervalos de 5-20ms, un `wait(ms)` fijo ya
// no garantiza que el número esperado de ticks haya ocurrido. En vez de esperar un
// tiempo fijo y contar, esperamos activamente hasta que el número de llamadas
// deseado ocurra (con un timeout generoso), lo que es robusto sea cual sea la carga
// de CPU del entorno.
async function waitUntilCalls(fn: { mock: { calls: unknown[] } }, n: number, timeoutMs = 3000): Promise<void> {
	const start = Date.now();
	while (fn.mock.calls.length < n) {
		if (Date.now() - start > timeoutMs) {
			throw new Error(`Timeout esperando ${n} llamadas (hubo ${fn.mock.calls.length})`);
		}
		await wait(5);
	}
}

describe('pollUntil', () => {
	it('resuelve (deja de llamar a fn) en cuanto fn devuelve true', async () => {
		const fn = mock(() => Promise.resolve(true));
		pollUntil({ fn, intervalMs: 5 });

		await wait(30);
		expect(fn).toHaveBeenCalledTimes(1);
	});

	it('reintenta en cada intervalo mientras fn devuelva false', async () => {
		let calls = 0;
		const fn = mock(() => {
			calls++;
			return Promise.resolve(calls >= 3); // se cumple en el 3er intento
		});

		pollUntil({ fn, intervalMs: 5 });

		await waitUntilCalls(fn, 3);
		// fn ya devolvió true en la 3ra llamada — dar tiempo de sobra y confirmar que no hay una 4ta.
		await wait(60);
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it('respeta el intervalo aproximado entre llamadas', async () => {
		const timestamps: number[] = [];
		const fn = mock(() => {
			timestamps.push(Date.now());
			return Promise.resolve(timestamps.length >= 3);
		});

		pollUntil({ fn, intervalMs: 20 });
		await waitUntilCalls(fn, 3);

		expect(timestamps.length).toBe(3);
		const gap1 = timestamps[1]! - timestamps[0]!;
		const gap2 = timestamps[2]! - timestamps[1]!;
		// Con setTimeout no hay garantía exacta (y menos bajo `--parallel` con CPU
		// compartida), pero el intervalo real nunca debería ser negativo ni ~0.
		expect(gap1).toBeGreaterThanOrEqual(5);
		expect(gap2).toBeGreaterThanOrEqual(5);
	});

	it('deja de reintentar (sin resolver "true") al alcanzar maxTries', async () => {
		const fn = mock(() => Promise.resolve(false)); // nunca se cumple
		pollUntil({ fn, intervalMs: 5, maxTries: 3 });

		await waitUntilCalls(fn, 3);
		// Ya alcanzó maxTries — confirmar que no hay una 4ta llamada después.
		await wait(60);
		expect(fn).toHaveBeenCalledTimes(3);
	});

	it('sin maxTries, sigue reintentando indefinidamente mientras fn siga devolviendo false', async () => {
		const fn = mock(() => Promise.resolve(false));
		const handle = pollUntil({ fn, intervalMs: 5 });

		await waitUntilCalls(fn, 4);
		const callsBeforeStop = (fn.mock.calls as unknown[][]).length;
		expect(callsBeforeStop).toBeGreaterThanOrEqual(4);

		handle.stop();
	});

	it('stop() detiene el polling inmediatamente, sin más llamadas a fn', async () => {
		const fn = mock(() => Promise.resolve(false));
		const handle = pollUntil({ fn, intervalMs: 5 });

		await wait(15);
		handle.stop();
		const callsAtStop = (fn.mock.calls as unknown[][]).length;

		await wait(40);
		expect((fn.mock.calls as unknown[][]).length).toBe(callsAtStop);
	});

	it('llamar a stop() antes del primer tick evita cualquier llamada a fn', async () => {
		const fn = mock(() => Promise.resolve(true));
		const handle = pollUntil({ fn, intervalMs: 10 });
		handle.stop();

		await wait(30);
		expect(fn).not.toHaveBeenCalled();
	});

	it('llamar a stop() múltiples veces no lanza', async () => {
		const fn = mock(() => Promise.resolve(false));
		const handle = pollUntil({ fn, intervalMs: 5 });
		expect(() => {
			handle.stop();
			handle.stop();
		}).not.toThrow();
	});

	it('devuelve un PollHandle síncronamente antes de la primera llamada a fn', () => {
		const fn = mock(() => Promise.resolve(true));
		const handle = pollUntil({ fn, intervalMs: 100 });
		expect(fn).not.toHaveBeenCalled();
		expect(typeof handle.stop).toBe('function');
		handle.stop();
	});

	it('fn que maneja su propio error internamente (catch + false) sigue reintentando con normalidad, tal como exige el contrato del docstring', async () => {
		let calls = 0;
		const fn = mock(async () => {
			calls++;
			try {
				if (calls < 3) throw new Error('fallo transitorio');
				return true;
			} catch {
				return false; // fn decide que el error no es fatal y reintenta
			}
		});

		pollUntil({ fn, intervalMs: 5 });
		await waitUntilCalls(fn, 3);
		// La 3ra llamada ya resolvió `true` — confirmar que no hay una 4ta después.
		await wait(60);

		expect(fn).toHaveBeenCalledTimes(3);
	});
});
