import { describe, it, expect, mock, afterEach, beforeEach } from 'bun:test';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';

afterEach(() => {
  cleanup();
  delete (globalThis as { __mockActionResult?: unknown }).__mockActionResult;
});

import BlockPropsPanel from './BlockPropsPanel.svelte';

const RICH_TEXT_PROPS = { content: 'Hola mundo' };

describe('BlockPropsPanel — renderizado de campos', () => {
  it('renderiza un campo por cada prop del schema (richText → textarea)', () => {
    render(BlockPropsPanel, {
      props: {
        blockId:      'block-1',
        blockType:    'richText',
        initialProps: RICH_TEXT_PROPS,
        onClose:      () => {},
        onSaved:      () => {},
      },
    });
    // fieldOverrides de 'richText' sobreescribe content → textarea
    expect(document.querySelector('textarea')).toBeTruthy();
    expect(screen.getByText('content *')).toBeTruthy();
  });

  it('precarga el valor inicial en el campo', () => {
    render(BlockPropsPanel, {
      props: {
        blockId:      'block-1',
        blockType:    'richText',
        initialProps: RICH_TEXT_PROPS,
        onClose:      () => {},
        onSaved:      () => {},
      },
    });
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Hola mundo');
  });

  it('renderiza asset-picker para campos con fieldOverrides imageUrl (hero-split)', () => {
    render(BlockPropsPanel, {
      props: {
        blockId:      'block-2',
        blockType:    'hero-split',
        initialProps: { heading: 'Título', imageUrl: '', imageAlt: '', reversed: false },
        onClose:      () => {},
        onSaved:      () => {},
      },
    });
    // AssetPicker renderiza un input readonly con placeholder de "sin imagen"
    expect(screen.getByPlaceholderText('Sin imagen seleccionada')).toBeTruthy();
  });

  it('muestra mensaje de tipo de bloque desconocido si no existe en el registry', () => {
    render(BlockPropsPanel, {
      props: {
        blockId:      'block-3',
        blockType:    'no-existe',
        initialProps: {},
        onClose:      () => {},
        onSaved:      () => {},
      },
    });
    expect(screen.getByText('Tipo de bloque desconocido: no-existe')).toBeTruthy();
  });
});

describe('BlockPropsPanel — integración con FieldControl / guardado', () => {
  beforeEach(() => {
    (globalThis as { __mockActionResult?: unknown }).__mockActionResult = { type: 'success', status: 200 };
  });

  it('actualizar un campo y guardar emite el bloque actualizado via onSaved', async () => {
    const onSaved = mock(() => {});
    render(BlockPropsPanel, {
      props: {
        blockId:      'block-1',
        blockType:    'richText',
        initialProps: RICH_TEXT_PROPS,
        onClose:      () => {},
        onSaved,
      },
    });

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Contenido nuevo';
    await fireEvent.input(textarea);

    await fireEvent.click(screen.getByText('Guardar'));
    // El submit handler mockeado de use:enhance resuelve en varios turnos de microtask;
    // fireEvent.click solo espera el flushSync de Svelte, no esta cadena async completa.
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });
    expect((onSaved.mock.calls as unknown[][])[0][0]).toEqual({ content: 'Contenido nuevo' });
  });

  it('no llama a onSaved si el guardado falla en el servidor', async () => {
    (globalThis as { __mockActionResult?: unknown }).__mockActionResult = {
      type: 'failure',
      status: 400,
      data:   { error: 'Error al guardar.' },
    };
    const onSaved = mock(() => {});
    render(BlockPropsPanel, {
      props: {
        blockId:      'block-1',
        blockType:    'richText',
        initialProps: RICH_TEXT_PROPS,
        onClose:      () => {},
        onSaved,
      },
    });

    await fireEvent.click(screen.getByText('Guardar'));
    // Espera a que el botón vuelva de "Guardando…" a "Guardar" (saving = false),
    // señal de que el submit handler terminó su cadena async completa.
    await waitFor(() => {
      expect(screen.getByText('Guardar')).toBeTruthy();
    });

    expect(onSaved).not.toHaveBeenCalled();
  });

  it('pulsar "Cancelar" llama a onClose', async () => {
    const onClose = mock(() => {});
    render(BlockPropsPanel, {
      props: {
        blockId:      'block-1',
        blockType:    'richText',
        initialProps: RICH_TEXT_PROPS,
        onClose,
        onSaved:      () => {},
      },
    });

    await fireEvent.click(screen.getByText('Cancelar'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('pasa el hidden input block_id/block_type correctos al form', () => {
    render(BlockPropsPanel, {
      props: {
        blockId:      'block-xyz',
        blockType:    'richText',
        initialProps: RICH_TEXT_PROPS,
        onClose:      () => {},
        onSaved:      () => {},
      },
    });
    const blockIdInput = document.querySelector('input[name="block_id"]') as HTMLInputElement;
    const blockTypeInput = document.querySelector('input[name="block_type"]') as HTMLInputElement;
    expect(blockIdInput.value).toBe('block-xyz');
    expect(blockTypeInput.value).toBe('richText');
  });
});
