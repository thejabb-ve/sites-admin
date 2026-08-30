import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

afterEach(() => cleanup());
import Button from './Button.svelte';
import ButtonHarness from './Button.test-harness.svelte';

describe('Button — variantes', () => {
  it('variant primary aplica su clase', () => {
    const { container } = render(ButtonHarness, { props: { variant: 'primary', label: 'Ok' } });
    const btn = container.querySelector('button')!;
    expect(btn.className).toContain('bg-blue-600');
  });

  it('variant secondary aplica su clase', () => {
    const { container } = render(ButtonHarness, { props: { variant: 'secondary', label: 'Ok' } });
    const btn = container.querySelector('button')!;
    expect(btn.className).toContain('bg-white');
    expect(btn.className).toContain('border-gray-300');
  });

  it('variant danger aplica su clase', () => {
    const { container } = render(ButtonHarness, { props: { variant: 'danger', label: 'Ok' } });
    const btn = container.querySelector('button')!;
    expect(btn.className).toContain('bg-red-600');
  });

  it('variant dark aplica su clase', () => {
    const { container } = render(ButtonHarness, { props: { variant: 'dark', label: 'Ok' } });
    const btn = container.querySelector('button')!;
    expect(btn.className).toContain('bg-dark');
  });

  it('variant warning aplica su clase', () => {
    const { container } = render(ButtonHarness, { props: { variant: 'warning', label: 'Ok' } });
    const btn = container.querySelector('button')!;
    expect(btn.className).toContain('bg-warning');
  });

  it('variant success aplica su clase', () => {
    const { container } = render(ButtonHarness, { props: { variant: 'success', label: 'Ok' } });
    const btn = container.querySelector('button')!;
    expect(btn.className).toContain('bg-success');
  });

  it('variant ghost aplica su clase', () => {
    const { container } = render(ButtonHarness, { props: { variant: 'ghost', label: 'Ok' } });
    const btn = container.querySelector('button')!;
    expect(btn.className).toContain('text-faint');
  });

  it('variant por defecto es primary', () => {
    const { container } = render(ButtonHarness, { props: { label: 'Ok' } });
    const btn = container.querySelector('button')!;
    expect(btn.className).toContain('bg-blue-600');
  });
});

describe('Button — estados', () => {
  it('disabled deshabilita el botón', () => {
    const { container } = render(ButtonHarness, { props: { disabled: true, label: 'Ok' } });
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('loading muestra loadingLabel', () => {
    render(ButtonHarness, { props: { loading: true, label: 'Guardar' } });
    expect(screen.getByText('Guardando…')).toBeTruthy();
  });

  it('loading con loadingLabel custom lo muestra', () => {
    render(ButtonHarness, { props: { loading: true, loadingLabel: 'Enviando…', label: 'Guardar' } });
    expect(screen.getByText('Enviando…')).toBeTruthy();
  });

  it('loading deshabilita el botón', () => {
    const { container } = render(ButtonHarness, { props: { loading: true, label: 'Ok' } });
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('sin loading ni disabled muestra el contenido normal', () => {
    render(ButtonHarness, { props: { label: 'Guardar' } });
    expect(screen.getByText('Guardar')).toBeTruthy();
  });
});

describe('Button — type', () => {
  it('type por defecto es button', () => {
    const { container } = render(ButtonHarness, { props: { label: 'Ok' } });
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.type).toBe('button');
  });

  it('type submit se aplica', () => {
    const { container } = render(ButtonHarness, { props: { type: 'submit', label: 'Ok' } });
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn.type).toBe('submit');
  });
});

describe('Button — evento onclick', () => {
  it('onclick se dispara en click normal', async () => {
    const onclick = mock(() => {});
    const { container } = render(ButtonHarness, { props: { onclick, label: 'Ok' } });
    await fireEvent.click(container.querySelector('button')!);
    expect(onclick).toHaveBeenCalledTimes(1);
  });

  it('onclick no se dispara cuando disabled', async () => {
    const onclick = mock(() => {});
    const { container } = render(ButtonHarness, { props: { onclick, disabled: true, label: 'Ok' } });
    await fireEvent.click(container.querySelector('button')!);
    expect(onclick).not.toHaveBeenCalled();
  });

  it('onclick no se dispara cuando loading', async () => {
    const onclick = mock(() => {});
    const { container } = render(ButtonHarness, { props: { onclick, loading: true, label: 'Ok' } });
    await fireEvent.click(container.querySelector('button')!);
    expect(onclick).not.toHaveBeenCalled();
  });
});
