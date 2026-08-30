import { describe, it, expect, afterEach, beforeEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import { tick } from 'svelte';

afterEach(() => cleanup());

import Toaster from './Toaster.svelte';
import { toasts, toast, dismiss } from '../toast.svelte';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

beforeEach(() => {
  // Limpia el store compartido entre tests (es un singleton a nivel de módulo).
  for (const t of [...toasts.list]) dismiss(t.id);
});

describe('Toaster — renderizado desde el store', () => {
  it('no renderiza nada cuando el store está vacío', () => {
    const { container } = render(Toaster);
    expect(container.querySelectorAll('.pointer-events-auto').length).toBe(0);
  });

  it('renderiza un toast cuando se añade al store', async () => {
    render(Toaster);
    toast('success', 'Guardado correctamente', 60_000);
    await tick();
    expect(screen.getByText('Guardado correctamente')).toBeTruthy();
  });

  it('renderiza múltiples toasts simultáneos', async () => {
    const { container } = render(Toaster);
    toast('success', 'uno', 60_000);
    toast('error', 'dos', 60_000);
    toast('info', 'tres', 60_000);
    await tick();

    expect(container.querySelectorAll('.pointer-events-auto').length).toBe(3);
    expect(screen.getByText('uno')).toBeTruthy();
    expect(screen.getByText('dos')).toBeTruthy();
    expect(screen.getByText('tres')).toBeTruthy();
  });
});

describe('Toaster — distinción visual por tipo', () => {
  it('aplica estilo de borde/texto verde a un toast success', async () => {
    render(Toaster);
    toast('success', 'ok', 60_000);
    await tick();
    const el = screen.getByText('ok').closest('.pointer-events-auto');
    expect(el?.className).toContain('border-green-500');
    expect(el?.className).toContain('text-green-800');
  });

  it('aplica estilo de borde/texto rojo a un toast error', async () => {
    render(Toaster);
    toast('error', 'fallo', 60_000);
    await tick();
    const el = screen.getByText('fallo').closest('.pointer-events-auto');
    expect(el?.className).toContain('border-red-500');
    expect(el?.className).toContain('text-red-800');
  });

  it('aplica estilo de borde/texto azul a un toast info', async () => {
    render(Toaster);
    toast('info', 'fyi', 60_000);
    await tick();
    const el = screen.getByText('fyi').closest('.pointer-events-auto');
    expect(el?.className).toContain('border-blue-500');
    expect(el?.className).toContain('text-blue-800');
  });

  it('cada tipo renderiza un icono SVG distinto dentro del toast', async () => {
    render(Toaster);
    toast('success', 'ok', 60_000);
    await tick();
    const el = screen.getByText('ok').closest('.pointer-events-auto');
    expect(el?.querySelector('svg')).toBeTruthy();
  });
});

describe('Toaster — cierre manual', () => {
  it('muestra un botón de cerrar por cada toast', async () => {
    render(Toaster);
    toast('success', 'uno', 60_000);
    toast('error', 'dos', 60_000);
    await tick();
    expect(screen.getAllByLabelText('Cerrar').length).toBe(2);
  });

  it('al pulsar cerrar, el toast desaparece del DOM', async () => {
    render(Toaster);
    toast('success', 'temporal', 60_000);
    await tick();
    expect(screen.getByText('temporal')).toBeTruthy();

    const closeBtn = screen.getByLabelText('Cerrar');
    await fireEvent.click(closeBtn);
    await tick();

    expect(screen.queryByText('temporal')).toBeNull();
  });

  it('cerrar un toast no afecta a los demás', async () => {
    const { container } = render(Toaster);
    toast('success', 'queda', 60_000);
    toast('error', 'se cierra', 60_000);
    await tick();

    const closeButtons = screen.getAllByLabelText('Cerrar');
    // El segundo toast renderizado corresponde a "se cierra"
    await fireEvent.click(closeButtons[1]!);
    await tick();

    expect(screen.getByText('queda')).toBeTruthy();
    expect(screen.queryByText('se cierra')).toBeNull();
    expect(container.querySelectorAll('.pointer-events-auto').length).toBe(1);
  });
});

describe('Toaster — auto-dismiss', () => {
  it('un toast desaparece del DOM tras cumplirse su duración', async () => {
    render(Toaster);
    toast('info', 'efímero', 20);
    await tick();
    expect(screen.getByText('efímero')).toBeTruthy();

    await wait(50);
    await tick();

    expect(screen.queryByText('efímero')).toBeNull();
  });

  it('el auto-dismiss de un toast no elimina otros toasts activos', async () => {
    render(Toaster);
    toast('info', 'corto', 15);
    toast('info', 'largo', 60_000);
    await tick();

    await wait(40);
    await tick();

    expect(screen.queryByText('corto')).toBeNull();
    expect(screen.getByText('largo')).toBeTruthy();
  });
});
