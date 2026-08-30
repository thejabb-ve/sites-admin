import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

afterEach(() => cleanup());

import FontSpecEditor from './FontSpecEditor.svelte';
import type { FontSpec } from '$lib/types';

const GOOGLE_SPEC: FontSpec = { family: 'Inter', weights: [400, 700], source: 'google' };

describe('FontSpecEditor — renderizado', () => {
  it('refleja el valor inicial en el input de familia', () => {
    render(FontSpecEditor, { props: { value: GOOGLE_SPEC, onUpdate: () => {} } });
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.value).toBe('Inter');
  });

  it('refleja el valor inicial en el select de origen', () => {
    render(FontSpecEditor, { props: { value: GOOGLE_SPEC, onUpdate: () => {} } });
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('google');
  });

  it('refleja los weights iniciales en el textarea, uno por línea', () => {
    render(FontSpecEditor, { props: { value: GOOGLE_SPEC, onUpdate: () => {} } });
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('400\n700');
  });

  it('muestra el preview de la fuente cuando hay family', () => {
    render(FontSpecEditor, { props: { value: GOOGLE_SPEC, onUpdate: () => {} } });
    expect(screen.getByText('Aa — Ejemplo 123')).toBeTruthy();
  });

  it('no muestra los campos de URL cuando el origen no es custom', () => {
    render(FontSpecEditor, { props: { value: GOOGLE_SPEC, onUpdate: () => {} } });
    expect(screen.queryByText('URLs de fuente')).toBeFalsy();
  });

  it('muestra los campos de URL cuando el origen es custom', () => {
    const customSpec: FontSpec = {
      family: 'Mi Fuente',
      weights: [400],
      source: 'custom',
      urls: [{ weight: 400, style: 'normal', url: 'https://cdn.test/font.woff2' }],
    };
    render(FontSpecEditor, { props: { value: customSpec, onUpdate: () => {} } });
    expect(screen.getByText('URLs de fuente')).toBeTruthy();
    expect(screen.getByDisplayValue('https://cdn.test/font.woff2')).toBeTruthy();
  });
});

describe('FontSpecEditor — callbacks', () => {
  it('cambiar la familia llama a onUpdate con el FontSpec actualizado', async () => {
    const onUpdate = mock(() => {});
    render(FontSpecEditor, { props: { value: GOOGLE_SPEC, onUpdate } });

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'Roboto';
    await fireEvent.input(input);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [spec] = onUpdate.mock.calls[0] as unknown as [FontSpec];
    expect(spec.family).toBe('Roboto');
    expect(spec.weights).toEqual([400, 700]);
    expect(spec.source).toBe('google');
  });

  it('cambiar los weights llama a onUpdate con el arreglo de pesos parseado', async () => {
    const onUpdate = mock(() => {});
    render(FontSpecEditor, { props: { value: GOOGLE_SPEC, onUpdate } });

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '300\n500\n900';
    await fireEvent.input(textarea);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [spec] = onUpdate.mock.calls[0] as unknown as [FontSpec];
    expect(spec.weights).toEqual([300, 500, 900]);
  });

  it('weights vacíos o inválidos caen en el default [400]', async () => {
    const onUpdate = mock(() => {});
    render(FontSpecEditor, { props: { value: GOOGLE_SPEC, onUpdate } });

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'no-es-un-numero';
    await fireEvent.input(textarea);

    const [spec] = onUpdate.mock.calls[0] as unknown as [FontSpec];
    expect(spec.weights).toEqual([400]);
  });

  // NOTA: `bind:value` en <select> (usado para `source`) se resuelve en runtime
  // vía `select.querySelector(':checked')` (ver svelte/internal/client bind_select_value).
  // happy-dom no implementa el pseudo-selector `:checked` sobre <option> (querySelector
  // siempre devuelve null), así que un cambio de `source` disparado por evento simulado
  // no es reproducible en este entorno de test — se cubre por separado con `source: 'custom'`
  // como prop inicial (ver bloque "renderizado" arriba).

  it('añadir una URL con origen custom llama a onUpdate con la nueva URL incluida', async () => {
    const onUpdate = mock(() => {});
    const customSpec: FontSpec = { family: 'Mi Fuente', weights: [400], source: 'custom', urls: [] };
    render(FontSpecEditor, { props: { value: customSpec, onUpdate } });

    await fireEvent.click(screen.getByText('+ Añadir'));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [spec] = onUpdate.mock.calls[0] as unknown as [FontSpec];
    expect(spec.urls).toEqual([{ weight: 400, url: '' }]);
  });

  it('quitar una URL llama a onUpdate sin esa URL', async () => {
    const onUpdate = mock(() => {});
    const customSpec: FontSpec = {
      family: 'Mi Fuente',
      weights: [400],
      source: 'custom',
      urls: [
        { weight: 400, style: 'normal', url: 'https://cdn.test/a.woff2' },
        { weight: 700, style: 'bold', url: 'https://cdn.test/b.woff2' },
      ],
    };
    const { container } = render(FontSpecEditor, { props: { value: customSpec, onUpdate } });

    const removeButtons = container.querySelectorAll('button[aria-label="Eliminar fuente"]');
    expect(removeButtons.length).toBe(2);
    await fireEvent.click(removeButtons[0]!);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [spec] = onUpdate.mock.calls[0] as unknown as [FontSpec];
    expect(spec.urls).toEqual([{ weight: 700, style: 'bold', url: 'https://cdn.test/b.woff2' }]);
  });

  it('editar el peso de una URL existente llama a onUpdate con el peso actualizado', async () => {
    const onUpdate = mock(() => {});
    const customSpec: FontSpec = {
      family: 'Mi Fuente',
      weights: [400],
      source: 'custom',
      urls: [{ weight: 400, style: 'normal', url: 'https://cdn.test/a.woff2' }],
    };
    render(FontSpecEditor, { props: { value: customSpec, onUpdate } });

    const weightInput = screen.getByLabelText('Peso de fuente') as HTMLInputElement;
    weightInput.value = '700';
    await fireEvent.input(weightInput);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [spec] = onUpdate.mock.calls[0] as unknown as [FontSpec];
    expect(spec.urls?.[0]?.weight).toBe(700);
  });
});
