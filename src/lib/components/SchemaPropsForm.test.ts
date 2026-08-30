import { describe, it, expect, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

afterEach(() => cleanup());
import SchemaPropsForm from './SchemaPropsForm.svelte';

const PROJECT = { id: 'proj-1', name: 'Proyecto de prueba' };

const BASE_PROPS = {
  entryKey:        'footer' as const,
  project:         PROJECT,
  breadcrumbLabel: 'Pie de página',
  heading:         'Editar pie de página',
  submitLabel:     'Guardar',
  savedMessage:    'Guardado correctamente.',
};

function hiddenPropsValue(): Record<string, unknown> {
  const input = document.querySelector('input[name="props"]') as HTMLInputElement;
  return JSON.parse(input.value) as Record<string, unknown>;
}

describe('SchemaPropsForm — renderizado', () => {
  it('renderiza un label y control por cada campo del schema', () => {
    render(SchemaPropsForm, {
      props: { ...BASE_PROPS, initialProps: { columns: [], legal: 'Todos los derechos reservados' } },
    });
    // El schema de footer tiene: columns (array-objects), legal (text), address (text),
    // legalLinks (array-objects), socials (array-objects)
    expect(screen.getByText('legal')).toBeTruthy();
    expect(screen.getByText('address')).toBeTruthy();
  });

  it('muestra el heading y el breadcrumb recibidos por props', () => {
    render(SchemaPropsForm, {
      props: { ...BASE_PROPS, initialProps: {} },
    });
    expect(screen.getByText('Editar pie de página')).toBeTruthy();
    expect(screen.getByText('Pie de página')).toBeTruthy();
    expect(screen.getByText(PROJECT.name)).toBeTruthy();
  });

  it('precarga los valores iniciales en los inputs de texto', () => {
    render(SchemaPropsForm, {
      props: { ...BASE_PROPS, initialProps: { legal: 'Legal inicial', address: 'Calle 1' } },
    });
    const legalInput = document.getElementById('footer-legal') as HTMLInputElement;
    const addressInput = document.getElementById('footer-address') as HTMLInputElement;
    expect(legalInput.value).toBe('Legal inicial');
    expect(addressInput.value).toBe('Calle 1');
  });

  it('el input oculto "props" refleja initialProps al montar', () => {
    render(SchemaPropsForm, {
      props: { ...BASE_PROPS, initialProps: { legal: 'Texto legal' } },
    });
    expect(hiddenPropsValue()['legal']).toBe('Texto legal');
  });

  it('el botón de submit usa el texto de submitLabel', () => {
    render(SchemaPropsForm, {
      props: { ...BASE_PROPS, initialProps: {} },
    });
    expect(screen.getByText('Guardar')).toBeTruthy();
  });
});

describe('SchemaPropsForm — edición de campos', () => {
  it('editar un campo de texto actualiza el input oculto "props" con el objeto completo', async () => {
    render(SchemaPropsForm, {
      props: { ...BASE_PROPS, initialProps: { legal: 'Original', address: 'Dirección original' } },
    });

    const legalInput = document.getElementById('footer-legal') as HTMLInputElement;
    legalInput.value = 'Legal actualizado';
    await fireEvent.input(legalInput);

    const props = hiddenPropsValue();
    expect(props['legal']).toBe('Legal actualizado');
    // El resto de campos se preserva
    expect(props['address']).toBe('Dirección original');
  });

  it('editar dos campos distintos acumula ambos cambios en el objeto de props', async () => {
    render(SchemaPropsForm, {
      props: { ...BASE_PROPS, initialProps: { legal: 'L', address: 'A' } },
    });

    const legalInput = document.getElementById('footer-legal') as HTMLInputElement;
    legalInput.value = 'Legal nuevo';
    await fireEvent.input(legalInput);

    const addressInput = document.getElementById('footer-address') as HTMLInputElement;
    addressInput.value = 'Dirección nueva';
    await fireEvent.input(addressInput);

    const props = hiddenPropsValue();
    expect(props['legal']).toBe('Legal nuevo');
    expect(props['address']).toBe('Dirección nueva');
  });
});

describe('SchemaPropsForm — campo header con asset-picker y etiquetas', () => {
  it('usa fieldLabels del registry para mostrar etiquetas legibles en vez de la key', () => {
    render(SchemaPropsForm, {
      props: {
        entryKey:        'header',
        project:         PROJECT,
        breadcrumbLabel: 'Encabezado',
        heading:         'Editar encabezado',
        submitLabel:     'Guardar',
        savedMessage:    'Guardado.',
        initialProps:    { links: [], ctaLabel: '', ctaHref: '', logo: '', logoDark: '' },
      },
    });
    expect(screen.getByText('Logo (modo claro)', { exact: false })).toBeTruthy();
    expect(screen.getByText('Logo (modo oscuro)', { exact: false })).toBeTruthy();
  });

  it('aplica fieldOverrides del registry: logo se renderiza como asset-picker', () => {
    render(SchemaPropsForm, {
      props: {
        entryKey:        'header',
        project:         PROJECT,
        breadcrumbLabel: 'Encabezado',
        heading:         'Editar encabezado',
        submitLabel:     'Guardar',
        savedMessage:    'Guardado.',
        initialProps:    { links: [], ctaLabel: '', ctaHref: '', logo: 'https://cdn.test/logo.png', logoDark: '' },
      },
    });
    // El AssetPicker renderiza un input[readonly] con la URL del asset
    const readonlyInputs = document.querySelectorAll('input[readonly]');
    const values = Array.from(readonlyInputs).map((el) => (el as HTMLInputElement).value);
    expect(values).toContain('https://cdn.test/logo.png');
  });
});
