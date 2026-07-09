import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

afterEach(() => cleanup());
import ArrayObjectEditor from './ArrayObjectEditor.svelte';
import type { FieldDef } from '../blocks/schemaToFields';

// Campo array-objects con sub-campos de texto
const FAQ_FIELD: FieldDef = {
  key:          'items',
  required:     true,
  inputType:    'array-objects',
  defaultValue: null,
  itemFields: [
    { key: 'question', required: true,  inputType: 'text', defaultValue: null },
    { key: 'answer',   required: false, inputType: 'text', defaultValue: null },
  ],
};

const FAQ_VALUE = [
  { question: 'Pregunta 1', answer: 'Respuesta 1' },
  { question: 'Pregunta 2', answer: 'Respuesta 2' },
];

// Campo con sub-campo nested-object
const PHASES_FIELD: FieldDef = {
  key:          'phases',
  required:     false,
  inputType:    'array-objects',
  defaultValue: null,
  itemFields: [{
    key:          'phase',
    required:     false,
    inputType:    'nested-object',
    defaultValue: null,
    subFields: [
      { key: 'title', required: true, inputType: 'text', defaultValue: null },
    ],
  }],
};

describe('ArrayObjectEditor — renderizado', () => {
  it('renderiza un bloque por cada elemento del array', () => {
    const { container } = render(ArrayObjectEditor, {
      props: { field: FAQ_FIELD, value: FAQ_VALUE, onUpdate: () => {} },
    });
    // Cada item tiene un botón de eliminar (✕)
    expect(container.querySelectorAll('button[aria-label="Eliminar elemento"]').length).toBe(2);
  });

  it('muestra el botón "Añadir elemento"', () => {
    render(ArrayObjectEditor, {
      props: { field: FAQ_FIELD, value: FAQ_VALUE, onUpdate: () => {} },
    });
    expect(screen.getByText('+ Añadir elemento')).toBeTruthy();
  });

  it('renderiza los sub-campos de cada item', () => {
    render(ArrayObjectEditor, {
      props: { field: FAQ_FIELD, value: FAQ_VALUE, onUpdate: () => {} },
    });
    // 2 items × 2 sub-campos = 4 inputs de texto
    expect(document.querySelectorAll('input[type="text"]').length).toBe(4);
  });

  it('renderiza textarea para sub-campo array-strings', () => {
    const fieldConStrings: FieldDef = {
      key:          'plans',
      required:     false,
      inputType:    'array-objects',
      defaultValue: null,
      itemFields: [{
        key: 'features', required: false, inputType: 'array-strings', defaultValue: null,
      }],
    };
    render(ArrayObjectEditor, {
      props: { field: fieldConStrings, value: [{ features: ['a', 'b'] }], onUpdate: () => {} },
    });
    expect(document.querySelector('textarea')).toBeTruthy();
  });

  it('sub-campo nested-object renderiza los controles del objeto anidado', () => {
    render(ArrayObjectEditor, {
      props: {
        field:    PHASES_FIELD,
        value:    [{ phase: { title: 'Fase 1' } }],
        onUpdate: () => {},
      },
    });
    // El input del sub-campo title del nested-object debe estar presente
    expect(document.querySelector('input[type="text"]')).toBeTruthy();
  });

  it('lista vacía muestra solo el botón de añadir', () => {
    const { container } = render(ArrayObjectEditor, {
      props: { field: FAQ_FIELD, value: [], onUpdate: () => {} },
    });
    expect(container.querySelectorAll('button[aria-label="Eliminar elemento"]').length).toBe(0);
    expect(screen.getByText('+ Añadir elemento')).toBeTruthy();
  });
});

describe('ArrayObjectEditor — callbacks', () => {
  it('añadir elemento llama a onUpdate con un item más', async () => {
    const onUpdate = mock(() => {});
    render(ArrayObjectEditor, {
      props: { field: FAQ_FIELD, value: FAQ_VALUE, onUpdate },
    });

    await fireEvent.click(screen.getByText('+ Añadir elemento'));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [items] = onUpdate.mock.calls[0] as [unknown[]];
    expect(items.length).toBe(3);
  });

  it('nuevo item tiene los defaults correctos (strings vacíos)', async () => {
    const onUpdate = mock(() => {});
    render(ArrayObjectEditor, {
      props: { field: FAQ_FIELD, value: [], onUpdate },
    });

    await fireEvent.click(screen.getByText('+ Añadir elemento'));

    const [items] = onUpdate.mock.calls[0] as [Record<string, unknown>[]];
    expect(items[0]).toEqual({ question: '', answer: '' });
  });

  it('eliminar elemento llama a onUpdate con un item menos', async () => {
    const onUpdate = mock(() => {});
    const { container } = render(ArrayObjectEditor, {
      props: { field: FAQ_FIELD, value: FAQ_VALUE, onUpdate },
    });

    const removeButtons = container.querySelectorAll('button[aria-label="Eliminar elemento"]');
    await fireEvent.click(removeButtons[0]!);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [items] = onUpdate.mock.calls[0] as [unknown[]];
    expect(items.length).toBe(1);
  });

  it('eliminar el primer item preserva el segundo', async () => {
    const onUpdate = mock(() => {});
    const { container } = render(ArrayObjectEditor, {
      props: { field: FAQ_FIELD, value: FAQ_VALUE, onUpdate },
    });

    const removeButtons = container.querySelectorAll('button[aria-label="Eliminar elemento"]');
    await fireEvent.click(removeButtons[0]!);

    const [items] = onUpdate.mock.calls[0] as [Record<string, unknown>[]];
    expect(items[0]).toEqual(FAQ_VALUE[1]);
  });

  it('actualizar sub-campo llama a onUpdate con el item modificado', async () => {
    const onUpdate = mock(() => {});
    render(ArrayObjectEditor, {
      props: { field: FAQ_FIELD, value: [{ question: 'Original', answer: '' }], onUpdate },
    });

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'Modificada';
    await fireEvent.input(input);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [items] = onUpdate.mock.calls[0] as [Record<string, unknown>[]];
    expect((items[0] as Record<string, unknown>)['question']).toBe('Modificada');
  });

  it('nuevo item con campo array-strings tiene [] como default', async () => {
    const fieldConStrings: FieldDef = {
      key:          'plans',
      required:     false,
      inputType:    'array-objects',
      defaultValue: null,
      itemFields: [{
        key: 'features', required: false, inputType: 'array-strings', defaultValue: null,
      }],
    };
    const onUpdate = mock(() => {});
    render(ArrayObjectEditor, {
      props: { field: fieldConStrings, value: [], onUpdate },
    });

    await fireEvent.click(screen.getByText('+ Añadir elemento'));

    const [items] = onUpdate.mock.calls[0] as [Record<string, unknown>[]];
    expect(items[0]).toEqual({ features: [] });
  });
});
