import { describe, it, expect, mock, afterEach, beforeEach } from 'bun:test';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';
import { tick } from 'svelte';

afterEach(() => {
  cleanup();
  delete (globalThis as { __mockActionResult?: unknown }).__mockActionResult;
});

import BlockList from './BlockList.svelte';
import type { Block } from '$lib/types';

function makeBlock(overrides: Partial<Block>): Block {
  return {
    id:      'id-1',
    type:    'richText',
    order:   0,
    props:   {},
    version: 1,
    ...overrides,
  };
}

const TWO_BLOCKS: Block[] = [
  makeBlock({ id: 'block-a', type: 'hero', order: 0, props: { heading: 'A' } }),
  makeBlock({ id: 'block-b', type: 'richText', order: 1, props: { content: 'B' } }),
];

describe('BlockList — renderizado', () => {
  it('renderiza un elemento por cada bloque con su etiqueta correcta', () => {
    render(BlockList, { props: { serverBlocks: TWO_BLOCKS } });
    expect(screen.getByText('Hero centrado')).toBeTruthy();
    expect(screen.getByText('Texto enriquecido')).toBeTruthy();
    expect(screen.getAllByRole('listitem').length).toBe(2);
  });

  it('usa el type como fallback de label si no existe en el registry', () => {
    render(BlockList, {
      props: { serverBlocks: [makeBlock({ id: 'x', type: 'tipo-inexistente' })] },
    });
    expect(screen.getByText('tipo-inexistente')).toBeTruthy();
  });

  it('lista vacía muestra el estado vacío sin romper', () => {
    render(BlockList, { props: { serverBlocks: [] } });
    expect(screen.getByText('Esta página no tiene bloques. Añade el primero.')).toBeTruthy();
    expect(screen.queryAllByRole('listitem').length).toBe(0);
  });

  it('no renderiza bloques hijo (con parent_block_id) como items de nivel raíz', () => {
    const blocks: Block[] = [
      makeBlock({ id: 'parent', type: 'countdown' }),
      makeBlock({ id: 'child', type: 'cta', parent_block_id: 'parent' }),
    ];
    render(BlockList, { props: { serverBlocks: blocks } });
    expect(screen.getAllByRole('listitem').length).toBe(1);
  });
});

describe('BlockList — editar bloque (BlockPropsPanel embebido)', () => {
  beforeEach(() => {
    (globalThis as { __mockActionResult?: unknown }).__mockActionResult = { type: 'success', status: 200 };
  });

  it('pulsar "Editar" abre el panel de props del bloque', async () => {
    render(BlockList, { props: { serverBlocks: TWO_BLOCKS } });
    const editButtons = screen.getAllByText('Editar');
    await fireEvent.click(editButtons[0]!);
    // El panel de richText/hero muestra sus campos; 'heading' es el campo del bloque hero
    expect(screen.getByText('heading *')).toBeTruthy();
    expect(screen.getByText('Cerrar')).toBeTruthy();
  });

  it('guardar en el panel actualiza el bloque local (onSaved) sin refrescar la página', async () => {
    render(BlockList, { props: { serverBlocks: TWO_BLOCKS } });

    // Abrir edición del segundo bloque (richText)
    const editButtons = screen.getAllByText('Editar');
    await fireEvent.click(editButtons[1]!);

    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'Contenido actualizado';
    await fireEvent.input(textarea);
    await fireEvent.click(screen.getByText('Guardar'));

    // El submit handler mockeado de use:enhance resuelve en varios turnos de micro/macrotask;
    // fireEvent.click solo espera el flushSync de Svelte, no esta cadena async completa.
    // waitFor sondea hasta que el panel se cierre (onSaved setea editingId = null).
    await waitFor(() => {
      expect(screen.queryByText('Cancelar')).toBeNull();
    });

    // Reabrir edición: el valor local debe reflejar el cambio guardado, sin volver a leer serverBlocks
    const editButtonsAfter = screen.getAllByText('Editar');
    await fireEvent.click(editButtonsAfter[1]!);
    const textareaAfter = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textareaAfter.value).toBe('Contenido actualizado');
  });
});

describe('BlockList — eliminar bloque', () => {
  it('pulsar "Eliminar bloque" envía el form oculto con el block_id correcto', async () => {
    (globalThis as { __mockActionResult?: unknown }).__mockActionResult = { type: 'success', status: 200 };
    render(BlockList, { props: { serverBlocks: TWO_BLOCKS } });

    const deleteButtons = screen.getAllByLabelText('Eliminar bloque');
    await fireEvent.click(deleteButtons[0]!);

    const blockIdInput = document.querySelector('input[name="block_id"]') as HTMLInputElement;
    await waitFor(() => {
      expect(blockIdInput.value).toBe('block-a');
    });
  });

  it('tras eliminar con éxito y refrescar serverBlocks (invalidateAll), el bloque desaparece', async () => {
    (globalThis as { __mockActionResult?: unknown }).__mockActionResult = { type: 'success', status: 200 };
    const { rerender } = render(BlockList, { props: { serverBlocks: TWO_BLOCKS } });

    expect(screen.getAllByRole('listitem').length).toBe(2);

    const deleteButtons = screen.getAllByLabelText('Eliminar bloque');
    await fireEvent.click(deleteButtons[0]!);
    await waitFor(() => {
      expect((document.querySelector('input[name="block_id"]') as HTMLInputElement).value).toBe('block-a');
    });

    // Simula el `update({ reset: false })` real de use:enhance, que por defecto dispara
    // invalidateAll() y termina refrescando la prop serverBlocks tras recargar el load().
    await rerender({ serverBlocks: [TWO_BLOCKS[1]!] });

    expect(screen.getAllByRole('listitem').length).toBe(1);
    expect(screen.queryByText('Hero centrado')).toBeNull();
    expect(screen.getByText('Texto enriquecido')).toBeTruthy();
  });

  it('el bloque borrado no reaparece mientras serverBlocks todavía no refleja el cambio (sin flicker)', async () => {
    // Antes del fix: el $effect de resync comparaba blocks (ya sin el borrado) contra
    // serverBlocks (todavía con los 2 originales, porque invalidateAll() no ha completado)
    // y revertía el borrado optimista hasta que la prop se actualizara.
    (globalThis as { __mockActionResult?: unknown }).__mockActionResult = { type: 'success', status: 200 };
    render(BlockList, { props: { serverBlocks: TWO_BLOCKS } });

    const deleteButtons = screen.getAllByLabelText('Eliminar bloque');
    await fireEvent.click(deleteButtons[0]!);

    await waitFor(() => {
      expect(screen.getAllByRole('listitem').length).toBe(1);
    });
    expect(screen.queryByText('Hero centrado')).toBeNull();

    // serverBlocks (la prop) sigue sin refrescar en este punto — no debe revertir el borrado.
    await tick();
    expect(screen.getAllByRole('listitem').length).toBe(1);
    expect(screen.queryByText('Hero centrado')).toBeNull();
  });

  it('un resync no relacionado (otro bloque cambia server-side) no hace reaparecer un borrado en curso', async () => {
    // Caso más estrecho del mismo bug: si serverBlocks cambia por un motivo ajeno al
    // borrado (ej. otra pestaña añade un bloque) mientras el invalidateAll() del borrado
    // sigue sin llegar, el resync no debe revertir el borrado optimista.
    (globalThis as { __mockActionResult?: unknown }).__mockActionResult = { type: 'success', status: 200 };
    const { rerender } = render(BlockList, { props: { serverBlocks: TWO_BLOCKS } });

    const deleteButtons = screen.getAllByLabelText('Eliminar bloque');
    await fireEvent.click(deleteButtons[0]!);
    await waitFor(() => {
      expect(screen.getAllByRole('listitem').length).toBe(1);
    });

    // serverBlocks todavía tiene los 2 originales (el borrado no confirmó), pero además
    // se añade un tercer bloque server-side — cambia el tamaño del set, dispara la rama !same.
    const thirdBlock = makeBlock({ id: 'block-c', type: 'richText', order: 2, props: { content: 'C' } });
    await rerender({ serverBlocks: [...TWO_BLOCKS, thirdBlock] });

    expect(screen.queryByText('Hero centrado')).toBeNull();
    expect(screen.getAllByRole('listitem').length).toBe(2);
  });

  it('si el servidor responde con error, el bloque permanece en la lista', async () => {
    (globalThis as { __mockActionResult?: unknown }).__mockActionResult = {
      type: 'failure',
      status: 400,
      data:   { error: 'Error al eliminar.' },
    };
    render(BlockList, { props: { serverBlocks: TWO_BLOCKS } });

    const deleteButtons = screen.getAllByLabelText('Eliminar bloque');
    await fireEvent.click(deleteButtons[0]!);
    await waitFor(() => {
      expect((document.querySelector('input[name="block_id"]') as HTMLInputElement).value).toBe('block-a');
    });

    expect(screen.getAllByRole('listitem').length).toBe(2);
  });
});

describe('BlockList — reordenar (drag & drop)', () => {
  it('arrastrar el primer bloque sobre el segundo intercambia su orden en el DOM', async () => {
    render(BlockList, { props: { serverBlocks: TWO_BLOCKS } });

    const items = screen.getAllByRole('listitem');
    expect(items[0]?.textContent).toContain('Hero centrado');
    expect(items[1]?.textContent).toContain('Texto enriquecido');

    await fireEvent.dragStart(items[0]!);
    await fireEvent.dragOver(items[1]!);
    await fireEvent.drop(items[1]!);

    const reordered = screen.getAllByRole('listitem');
    expect(reordered[0]?.textContent).toContain('Texto enriquecido');
    expect(reordered[1]?.textContent).toContain('Hero centrado');
  });

  it('soltar sobre el mismo índice no cambia el orden', async () => {
    render(BlockList, { props: { serverBlocks: TWO_BLOCKS } });

    const items = screen.getAllByRole('listitem');
    await fireEvent.dragStart(items[0]!);
    await fireEvent.dragOver(items[0]!);
    await fireEvent.drop(items[0]!);

    const after = screen.getAllByRole('listitem');
    expect(after[0]?.textContent).toContain('Hero centrado');
    expect(after[1]?.textContent).toContain('Texto enriquecido');
  });
});
