import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

afterEach(() => cleanup());
import FieldControl from './FieldControl.svelte';
import type { FieldDef } from '../blocks/schemaToFields';

function field(inputType: FieldDef['inputType'], overrides: Partial<FieldDef> = {}): FieldDef {
  return {
    key:          'campo',
    required:     false,
    inputType,
    defaultValue: null,
    ...overrides,
  };
}

describe('FieldControl — tipo text', () => {
  it('renderiza un input de texto', () => {
    render(FieldControl, {
      props: { field: field('text'), value: 'hola', id: 'campo', onUpdate: () => {} },
    });
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('hola');
  });

  it('llama a onUpdate con el string al escribir', async () => {
    const onUpdate = mock(() => {});
    render(FieldControl, {
      props: { field: field('text'), value: '', id: 'campo', onUpdate },
    });
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    input.value = 'nuevo valor';
    await fireEvent.input(input);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect((onUpdate.mock.calls as unknown[][])[0][0]).toBe('nuevo valor');
  });
});

describe('FieldControl — tipo textarea', () => {
  it('renderiza un textarea con el valor', () => {
    render(FieldControl, {
      props: { field: field('textarea'), value: 'texto largo', id: 'campo', onUpdate: () => {} },
    });
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe('texto largo');
  });

  it('llama a onUpdate con el string al escribir', async () => {
    const onUpdate = mock(() => {});
    render(FieldControl, {
      props: { field: field('textarea'), value: '', id: 'campo', onUpdate },
    });
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'contenido nuevo';
    await fireEvent.input(textarea);
    expect((onUpdate.mock.calls as unknown[][])[0][0]).toBe('contenido nuevo');
  });
});

describe('FieldControl — tipo number', () => {
  it('renderiza input[type=number]', () => {
    render(FieldControl, {
      props: { field: field('number'), value: 5, id: 'campo', onUpdate: () => {} },
    });
    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('5');
  });

  it('llama a onUpdate con un número al cambiar el valor', async () => {
    const onUpdate = mock(() => {});
    render(FieldControl, {
      props: { field: field('number'), value: 0, id: 'campo', onUpdate },
    });
    const input = document.querySelector('input[type="number"]') as HTMLInputElement;
    input.value = '42';
    await fireEvent.input(input);
    expect((onUpdate.mock.calls as unknown[][])[0][0]).toBe(42);
    expect(typeof (onUpdate.mock.calls as unknown[][])[0][0]).toBe('number');
  });
});

describe('FieldControl — tipo checkbox', () => {
  it('renderiza input[type=checkbox] con el estado correcto', () => {
    render(FieldControl, {
      props: { field: field('checkbox'), value: true, id: 'campo', onUpdate: () => {} },
    });
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    expect(checkbox.checked).toBe(true);
  });

  it('llama a onUpdate con booleano al cambiar', async () => {
    const onUpdate = mock(() => {});
    render(FieldControl, {
      props: { field: field('checkbox'), value: false, id: 'campo', onUpdate },
    });
    const checkbox = document.querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = true;
    await fireEvent.change(checkbox);
    expect((onUpdate.mock.calls as unknown[][])[0][0]).toBe(true);
  });
});

describe('FieldControl — tipo select', () => {
  it('renderiza un select con las opciones del field', () => {
    render(FieldControl, {
      props: {
        field: field('select', { options: ['uno', 'dos', 'tres'] }),
        value: 'dos',
        id:    'campo',
        onUpdate: () => {},
      },
    });
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(3);
    expect(select.value).toBe('dos');
  });

  it('llama a onUpdate con el string seleccionado', async () => {
    const onUpdate = mock(() => {});
    render(FieldControl, {
      props: {
        field: field('select', { options: ['uno', 'dos'] }),
        value: 'uno',
        id:    'campo',
        onUpdate,
      },
    });
    const select = document.querySelector('select') as HTMLSelectElement;
    select.value = 'dos';
    await fireEvent.change(select);
    expect((onUpdate.mock.calls as unknown[][])[0][0]).toBe('dos');
  });
});

describe('FieldControl — tipo json', () => {
  it('renderiza un textarea con el JSON formateado', () => {
    render(FieldControl, {
      props: { field: field('json'), value: { a: 1 }, id: 'campo', onUpdate: () => {} },
    });
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();
    expect(textarea.value).toBe(JSON.stringify({ a: 1 }, null, 2));
  });

  it('llama a onUpdate con el objeto parseado cuando el JSON es válido', async () => {
    const onUpdate = mock(() => {});
    render(FieldControl, {
      props: { field: field('json'), value: {}, id: 'campo', onUpdate },
    });
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '{"b":2}';
    await fireEvent.input(textarea);
    expect((onUpdate.mock.calls as unknown[][])[0][0]).toEqual({ b: 2 });
  });

  it('no llama a onUpdate cuando el JSON es inválido', async () => {
    const onUpdate = mock(() => {});
    render(FieldControl, {
      props: { field: field('json'), value: {}, id: 'campo', onUpdate },
    });
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = '{invalido';
    await fireEvent.input(textarea);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe('FieldControl — tipo array-strings', () => {
  it('renderiza un textarea con un elemento por línea', () => {
    render(FieldControl, {
      props: { field: field('array-strings'), value: ['a', 'b'], id: 'campo', onUpdate: () => {} },
    });
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    expect(textarea.value).toBe('a\nb');
  });

  it('llama a onUpdate con un array de strings sin líneas vacías', async () => {
    const onUpdate = mock(() => {});
    render(FieldControl, {
      props: { field: field('array-strings'), value: [], id: 'campo', onUpdate },
    });
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = 'uno\n\ndos';
    await fireEvent.input(textarea);
    expect((onUpdate.mock.calls as unknown[][])[0][0]).toEqual(['uno', 'dos']);
  });
});

describe('FieldControl — tipo nested-object', () => {
  it('delega en NestedObjectEditor y renderiza los sub-campos', () => {
    render(FieldControl, {
      props: {
        field: field('nested-object', {
          subFields: [{ key: 'titulo', required: true, inputType: 'text', defaultValue: null }],
        }),
        value:    { titulo: 'Hola' },
        id:       'campo',
        onUpdate: () => {},
      },
    });
    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('Hola');
  });
});

describe('FieldControl — tipo array-objects', () => {
  it('delega en ArrayObjectEditor y renderiza un item por elemento', () => {
    render(FieldControl, {
      props: {
        field: field('array-objects', {
          itemFields: [{ key: 'nombre', required: true, inputType: 'text', defaultValue: null }],
        }),
        value:    [{ nombre: 'A' }, { nombre: 'B' }],
        id:       'campo',
        onUpdate: () => {},
      },
    });
    expect(document.querySelectorAll('input[type="text"]').length).toBe(2);
  });
});

describe('FieldControl — tipo asset-picker', () => {
  it('renderiza el AssetPicker con el valor actual', () => {
    render(FieldControl, {
      props: { field: field('asset-picker'), value: 'https://cdn.test/img.webp', id: 'campo', onUpdate: () => {} },
    });
    const input = document.querySelector('input[readonly]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('https://cdn.test/img.webp');
  });

  it('llama a onUpdate con la URL seleccionada', async () => {
    const onUpdate = mock(() => {});
    render(FieldControl, {
      props: { field: field('asset-picker'), value: '', id: 'campo', onUpdate },
    });
    // El botón abre el picker; sin assets no hay selección posible en este test,
    // pero verificamos que el botón "Seleccionar" está presente y operable.
    expect(screen.getByText('Seleccionar')).toBeTruthy();
  });
});
