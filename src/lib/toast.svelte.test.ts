import { describe, it, expect, beforeEach } from 'bun:test';
import { toasts, toast, dismiss } from './toast.svelte';

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
	// Limpia el store compartido entre tests (es un singleton a nivel de módulo).
	for (const t of [...toasts.list]) dismiss(t.id);
});

describe('toast()', () => {
	it('añade un toast a la lista con el type y message dados', () => {
		toast('success', 'Guardado correctamente', 60_000);
		expect(toasts.list.length).toBe(1);
		expect(toasts.list[0]!.type).toBe('success');
		expect(toasts.list[0]!.message).toBe('Guardado correctamente');
	});

	it('asigna ids incrementales distintos a cada toast', () => {
		toast('info', 'uno', 60_000);
		toast('info', 'dos', 60_000);
		const ids = toasts.list.map((t) => t.id);
		expect(new Set(ids).size).toBe(2);
	});

	it('soporta múltiples toasts simultáneos de distinto tipo', () => {
		toast('success', 'ok', 60_000);
		toast('error', 'fallo', 60_000);
		toast('info', 'fyi', 60_000);

		expect(toasts.list.length).toBe(3);
		expect(toasts.list.map((t) => t.type)).toEqual(['success', 'error', 'info']);
	});

	it('usa 4000ms de duración por defecto para el auto-dismiss', async () => {
		toast('info', 'default duration');
		expect(toasts.list.length).toBe(1);

		await wait(30);
		// A los 30ms no debería haberse auto-descartado todavía (duración por defecto 4000ms)
		expect(toasts.list.length).toBe(1);
	});

	it('se auto-descarta tras durationMs', async () => {
		toast('success', 'temporal', 20);
		expect(toasts.list.length).toBe(1);

		await wait(50);
		expect(toasts.list.length).toBe(0);
	});

	it('el auto-dismiss de un toast no afecta a otros toasts activos', async () => {
		toast('info', 'corto', 15);
		toast('info', 'largo', 60_000);

		await wait(40);

		expect(toasts.list.length).toBe(1);
		expect(toasts.list[0]!.message).toBe('largo');
	});
});

describe('dismiss()', () => {
	it('elimina el toast con el id indicado', () => {
		toast('info', 'a', 60_000);
		const id = toasts.list[0]!.id;
		dismiss(id);
		expect(toasts.list.length).toBe(0);
	});

	it('no lanza al descartar un id inexistente', () => {
		expect(() => dismiss(-999)).not.toThrow();
	});

	it('descartar dos veces el mismo id es un no-op la segunda vez', () => {
		toast('info', 'a', 60_000);
		const id = toasts.list[0]!.id;
		dismiss(id);
		expect(() => dismiss(id)).not.toThrow();
		expect(toasts.list.length).toBe(0);
	});

	it('elimina solo el toast correspondiente cuando hay varios', () => {
		toast('success', 'primero', 60_000);
		toast('error', 'segundo', 60_000);
		toast('info', 'tercero', 60_000);

		const secondId = toasts.list[1]!.id;
		dismiss(secondId);

		expect(toasts.list.length).toBe(2);
		expect(toasts.list.map((t) => t.message)).toEqual(['primero', 'tercero']);
	});
});
