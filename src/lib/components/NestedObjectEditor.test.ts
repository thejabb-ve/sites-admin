import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

afterEach(() => cleanup());
import NestedObjectEditor from './NestedObjectEditor.svelte';
import type { FieldDef } from '../blocks/schemaToFields';

// Campo con sub-campos de varios tipos
const PHASE_FIELD: FieldDef = {
  key:          'phase',
  required:     true,
  inputType:    'nested-object',
  defaultValue: null,
  subFields: [
    { key: 'title',       required: true,  inputType: 'text',     defaultValue: null },
    { key: 'description', required: false, inputType: 'textarea', defaultValue: null },
    { key: 'count',       required: false, inputType: 'number',   defaultValue: 0    },
    { key: 'active',      required: false, inputType: 'checkbox', defaultValue: false },
  ],
};

const PHASE_VALUE = { title: 'Hola', description: 'Desc', count: 2, active: true };

describe('NestedObjectEditor — renderizado', () => {
  it('renderiza un control por cada subField', () => {
    render(NestedObjectEditor, {
      props: { field: PHASE_FIELD, value: PHASE_VALUE, onUpdate: () => {} },
    });
    expect(document.querySelectorAll('input, textarea').length).toBe(4);
  });

  it('muestra * solo en campos required', () => {
    render(NestedObjectEditor, {
      props: { field: PHASE_FIELD, value: PHASE_VALUE, onUpdate: () => {} },
    });
    expect(screen.getByText('title *')).toBeTruthy();
    expect(screen.getByText('description')).toBeTruthy();
  });

  it('renderiza textarea para inputType textarea', () => {
    render(NestedObjectEditor, {
      props: { field: PHASE_FIELD, value: PHASE_VALUE, onUpdate: () => {} },
    });
    expect(document.querySelector('textarea')).toBeTruthy();
  });

  it('renderiza input[type=number] para inputType number', () => {
    render(NestedObjectEditor, {
      props: { field: PHASE_FIELD, value: PHASE_VALUE, onUpdate: () => {} },
    });
    expect(document.querySelector('input[type="number"]')).toBeTruthy();
  });

  it('renderiza input[type=checkbox] para inputType checkbox', () => {
    render(NestedObjectEditor, {
      props: { field: PHASE_FIELD, value: PHASE_VALUE, onUpdate: () => {} },
    });
    expect(document.querySelector('input[type="checkbox"]')).toBeTruthy();
  });

  it('renderiza select con opciones para inputType select', () => {
    const fieldConSelect: FieldDef = {
      key:          'nivel',
      required:     false,
      inputType:    'nested-object',
      defaultValue: null,
      subFields: [{
        key: 'variant', required: false, inputType: 'select', defaultValue: null,
        options: ['primary', 'secondary'],
      }],
    };
    render(NestedObjectEditor, {
      props: { field: fieldConSelect, value: { variant: 'primary' }, onUpdate: () => {} },
    });
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(2);
  });

  it('renderiza sub-editor para inputType nested-object anidado', () => {
    const fieldAnidado: FieldDef = {
      key:          'outer',
      required:     false,
      inputType:    'nested-object',
      defaultValue: null,
      subFields: [{
        key:          'inner',
        required:     false,
        inputType:    'nested-object',
        defaultValue: null,
        subFields: [
          { key: 'label', required: false, inputType: 'text', defaultValue: null },
        ],
      }],
    };
    render(NestedObjectEditor, {
      props: {
        field:    fieldAnidado,
        value:    { inner: { label: 'CTA' } },
        onUpdate: () => {},
      },
    });
    // El input del campo anidado debe aparecer en el DOM
    expect(document.querySelector('input[type="text"]')).toBeTruthy();
  });
});

describe('NestedObjectEditor — callbacks', () => {
  it('llama a onUpdate con el valor actualizado al cambiar un text input', async () => {
    const onUpdate = mock(() => {});
    render(NestedObjectEditor, {
      props: { field: PHASE_FIELD, value: PHASE_VALUE, onUpdate },
    });

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'Nuevo título';
    await fireEvent.input(input);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [called] = onUpdate.mock.calls[0] as [Record<string, unknown>];
    expect(called['title']).toBe('Nuevo título');
  });

  it('preserva los otros campos al actualizar uno', async () => {
    const onUpdate = mock(() => {});
    render(NestedObjectEditor, {
      props: { field: PHASE_FIELD, value: PHASE_VALUE, onUpdate },
    });

    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'Cambiado';
    await fireEvent.input(input);

    const [called] = onUpdate.mock.calls[0] as [Record<string, unknown>];
    expect(called['description']).toBe(PHASE_VALUE.description);
    expect(called['count']).toBe(PHASE_VALUE.count);
  });

  it('llama a onUpdate con valor booleano al cambiar checkbox', async () => {
    const onUpdate = mock(() => {});
    render(NestedObjectEditor, {
      props: { field: PHASE_FIELD, value: { ...PHASE_VALUE, active: false }, onUpdate },
    });

    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = true;
    await fireEvent.change(checkbox);

    const [called] = onUpdate.mock.calls[0] as [Record<string, unknown>];
    expect(called['active']).toBe(true);
  });

  it('llama a onUpdate con número al cambiar number input', async () => {
    const onUpdate = mock(() => {});
    render(NestedObjectEditor, {
      props: { field: PHASE_FIELD, value: PHASE_VALUE, onUpdate },
    });

    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
    input.value = '7';
    await fireEvent.input(input);

    const [called] = onUpdate.mock.calls[0] as [Record<string, unknown>];
    expect(called['count']).toBe(7);
  });
});
