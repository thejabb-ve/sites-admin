import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

afterEach(() => cleanup());

import BlockTypeSelector from './BlockTypeSelector.svelte';

describe('BlockTypeSelector — apertura/cierre', () => {
  it('no renderiza el modal cuando open es false', () => {
    render(BlockTypeSelector, {
      props: { open: false, onSelect: () => {} },
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renderiza el modal cuando open es true', () => {
    render(BlockTypeSelector, {
      props: { open: true, onSelect: () => {} },
    });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('cierra el modal al pulsar "Cancelar"', async () => {
    render(BlockTypeSelector, {
      props: { open: true, onSelect: () => {} },
    });
    await fireEvent.click(screen.getByText('Cancelar'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('cierra el modal al pulsar el fondo (backdrop)', async () => {
    render(BlockTypeSelector, {
      props: { open: true, onSelect: () => {} },
    });
    await fireEvent.click(screen.getByLabelText('Cerrar'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('BlockTypeSelector — tipos de bloque disponibles', () => {
  it('renderiza solo los bloques de scope "page" (o sin scope) del registry', () => {
    render(BlockTypeSelector, {
      props: { open: true, onSelect: () => {} },
    });
    // 10 bloques con scope 'page' (por defecto): hero, hero-split, richText, gallery,
    // featureGrid, faq, pricing, countdown, form, cta.
    const dialog = screen.getByRole('dialog');
    const buttons = dialog.querySelectorAll('div.grid > button');
    expect(buttons.length).toBe(10);
  });

  it('muestra la etiqueta (label) de cada tipo de bloque', () => {
    render(BlockTypeSelector, {
      props: { open: true, onSelect: () => {} },
    });
    expect(screen.getByText('Hero centrado')).toBeTruthy();
    expect(screen.getByText('Preguntas frecuentes')).toBeTruthy();
    expect(screen.getByText('Llamada a la acción (CTA)')).toBeTruthy();
  });

  it('excluye los bloques de scope "site" (header, footer)', () => {
    render(BlockTypeSelector, {
      props: { open: true, onSelect: () => {} },
    });
    expect(screen.queryByText('Encabezado (navegación)')).toBeNull();
    expect(screen.queryByText('Pie de página')).toBeNull();
  });
});

describe('BlockTypeSelector — selección', () => {
  it('seleccionar un tipo llama a onSelect con el tipo correcto', async () => {
    const onSelect = mock(() => {});
    render(BlockTypeSelector, {
      props: { open: true, onSelect },
    });

    await fireEvent.click(screen.getByText('Preguntas frecuentes'));

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect((onSelect.mock.calls as unknown[][])[0][0]).toBe('faq');
  });

  it('seleccionar un tipo cierra el modal', async () => {
    render(BlockTypeSelector, {
      props: { open: true, onSelect: () => {} },
    });

    await fireEvent.click(screen.getByText('Preguntas frecuentes'));

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
