import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

// $app/forms es un módulo virtual de SvelteKit — bun test no lo resuelve.
// Mock mínimo: el componente solo lo usa como acción `use:enhance` en el <form>,
// que estos tests no llegan a disparar (solo verificamos que el botón abre el
// ConfirmDialog, no que el submit real funcione).
mock.module('$app/forms', () => ({
  enhance: () => {},
}));

afterEach(() => cleanup());

const { default: BrandLegalForm } = await import('./BrandLegalForm.svelte');
import type { LegalDraft } from '$lib/types';

const DEFAULT_PROPS = {
  address:      'Av. Ejemplo 123',
  legalName:    'Mi Empresa S.A.',
  taxId:        'XAXX010101000',
  businessType: 'Servicios de tecnología',
  postalCode:   '06600',
  city:         'Ciudad de México',
  region:       'CDMX',
  country:      'México',
  email:        'contacto@empresa.com',
  phone:        '+52 55 1234 5678',
  legalLinks:   [{ label: 'Aviso Legal', href: 'https://empresa.com/aviso-legal' }],
  action:       '?/generateLegal',
};

describe('BrandLegalForm — renderizado', () => {
  it('renderiza todos los campos con sus valores iniciales', () => {
    render(BrandLegalForm, { props: { ...DEFAULT_PROPS, onUpdate: () => {} } });

    expect((document.getElementById('legal-name') as HTMLInputElement).value).toBe(DEFAULT_PROPS.legalName);
    expect((document.getElementById('legal-business-type') as HTMLInputElement).value).toBe(DEFAULT_PROPS.businessType);
    expect((document.getElementById('legal-tax-id') as HTMLInputElement).value).toBe(DEFAULT_PROPS.taxId);
    expect((document.getElementById('legal-address') as HTMLTextAreaElement).value).toBe(DEFAULT_PROPS.address);
    expect((document.getElementById('legal-postal-code') as HTMLInputElement).value).toBe(DEFAULT_PROPS.postalCode);
    expect((document.getElementById('legal-city') as HTMLInputElement).value).toBe(DEFAULT_PROPS.city);
    expect((document.getElementById('legal-state') as HTMLInputElement).value).toBe(DEFAULT_PROPS.region);
    expect((document.getElementById('legal-country') as HTMLInputElement).value).toBe(DEFAULT_PROPS.country);
    expect((document.getElementById('legal-email') as HTMLInputElement).value).toBe(DEFAULT_PROPS.email);
    expect((document.getElementById('legal-phone') as HTMLInputElement).value).toBe(DEFAULT_PROPS.phone);
  });

  it('renderiza los enlaces legales existentes', () => {
    render(BrandLegalForm, { props: { ...DEFAULT_PROPS, onUpdate: () => {} } });
    expect(screen.getByDisplayValue('Aviso Legal')).toBeTruthy();
    expect(screen.getByDisplayValue('https://empresa.com/aviso-legal')).toBeTruthy();
  });

  it('sin enlaces legales muestra el mensaje vacío', () => {
    render(BrandLegalForm, { props: { ...DEFAULT_PROPS, legalLinks: [], onUpdate: () => {} } });
    expect(screen.getByText('Sin enlaces legales configurados.')).toBeTruthy();
  });
});

describe('BrandLegalForm — callbacks de campos', () => {
  it('editar el nombre legal llama a onUpdate con el LegalDraft completo actualizado', async () => {
    const onUpdate = mock(() => {});
    render(BrandLegalForm, { props: { ...DEFAULT_PROPS, onUpdate } });

    const input = document.getElementById('legal-name') as HTMLInputElement;
    input.value = 'Nueva Razón Social';
    await fireEvent.input(input);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [draft] = onUpdate.mock.calls[0] as unknown as [LegalDraft];
    expect(draft.legal_name).toBe('Nueva Razón Social');
    // El resto de los campos se preservan
    expect(draft.tax_id).toBe(DEFAULT_PROPS.taxId);
    expect(draft.address).toBe(DEFAULT_PROPS.address);
    expect(draft.state).toBe(DEFAULT_PROPS.region);
  });

  it('editar `region` mapea correctamente a la clave `state` del LegalDraft emitido', async () => {
    const onUpdate = mock(() => {});
    render(BrandLegalForm, { props: { ...DEFAULT_PROPS, onUpdate } });

    const input = document.getElementById('legal-state') as HTMLInputElement;
    input.value = 'Jalisco';
    await fireEvent.input(input);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [draft] = onUpdate.mock.calls[0] as unknown as [LegalDraft];
    expect(draft.state).toBe('Jalisco');
    expect((draft as unknown as Record<string, unknown>)['region']).toBeUndefined();
  });

  it('editar la dirección llama a onUpdate con `address` actualizado', async () => {
    const onUpdate = mock(() => {});
    render(BrandLegalForm, { props: { ...DEFAULT_PROPS, onUpdate } });

    const textarea = document.getElementById('legal-address') as HTMLTextAreaElement;
    textarea.value = 'Nueva Calle 456';
    await fireEvent.input(textarea);

    const [draft] = onUpdate.mock.calls[0] as unknown as [LegalDraft];
    expect(draft.address).toBe('Nueva Calle 456');
  });

  it('editar el email llama a onUpdate con `email` actualizado', async () => {
    const onUpdate = mock(() => {});
    render(BrandLegalForm, { props: { ...DEFAULT_PROPS, onUpdate } });

    const input = document.getElementById('legal-email') as HTMLInputElement;
    input.value = 'nuevo@empresa.com';
    await fireEvent.input(input);

    const [draft] = onUpdate.mock.calls[0] as unknown as [LegalDraft];
    expect(draft.email).toBe('nuevo@empresa.com');
  });
});

describe('BrandLegalForm — callbacks de enlaces legales', () => {
  it('añadir enlace legal llama a onUpdate con un enlace más', async () => {
    const onUpdate = mock(() => {});
    render(BrandLegalForm, { props: { ...DEFAULT_PROPS, onUpdate } });

    await fireEvent.click(screen.getByText('+ Añadir enlace'));

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [draft] = onUpdate.mock.calls[0] as unknown as [LegalDraft];
    expect(draft.legalLinks.length).toBe(2);
    expect(draft.legalLinks[1]).toEqual({ label: '', href: '' });
  });

  it('eliminar enlace legal llama a onUpdate con un enlace menos', async () => {
    const onUpdate = mock(() => {});
    const { container } = render(BrandLegalForm, {
      props: {
        ...DEFAULT_PROPS,
        legalLinks: [
          { label: 'Aviso Legal', href: 'https://empresa.com/aviso-legal' },
          { label: 'Cookies', href: 'https://empresa.com/cookies' },
        ],
        onUpdate,
      },
    });

    const removeButtons = container.querySelectorAll('button');
    const removeBtn = Array.from(removeButtons).find(b => b.textContent?.trim() === '✕');
    await fireEvent.click(removeBtn!);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [draft] = onUpdate.mock.calls[0] as unknown as [LegalDraft];
    expect(draft.legalLinks.length).toBe(1);
    expect(draft.legalLinks[0]).toEqual({ label: 'Cookies', href: 'https://empresa.com/cookies' });
  });

  it('editar la etiqueta de un enlace legal llama a onUpdate con el enlace modificado', async () => {
    const onUpdate = mock(() => {});
    render(BrandLegalForm, { props: { ...DEFAULT_PROPS, onUpdate } });

    const input = screen.getByDisplayValue('Aviso Legal') as HTMLInputElement;
    input.value = 'Aviso Legal Modificado';
    await fireEvent.input(input);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [draft] = onUpdate.mock.calls[0] as unknown as [LegalDraft];
    expect(draft.legalLinks[0]!.label).toBe('Aviso Legal Modificado');
    expect(draft.legalLinks[0]!.href).toBe(DEFAULT_PROPS.legalLinks[0]!.href);
  });

  it('editar la URL de un enlace legal llama a onUpdate con el enlace modificado', async () => {
    const onUpdate = mock(() => {});
    render(BrandLegalForm, { props: { ...DEFAULT_PROPS, onUpdate } });

    const input = screen.getByDisplayValue('https://empresa.com/aviso-legal') as HTMLInputElement;
    input.value = 'https://empresa.com/nuevo-aviso';
    await fireEvent.input(input);

    const [draft] = onUpdate.mock.calls[0] as unknown as [LegalDraft];
    expect(draft.legalLinks[0]!.href).toBe('https://empresa.com/nuevo-aviso');
  });
});

describe('BrandLegalForm — generar páginas legales', () => {
  it('el botón "Generar páginas legales" abre el ConfirmDialog en vez de enviar el formulario directamente', async () => {
    const { container } = render(BrandLegalForm, { props: { ...DEFAULT_PROPS, onUpdate: () => {} } });

    // Antes del click, no hay diálogo de confirmación
    expect(container.querySelector('[role="dialog"]')).toBeFalsy();

    await fireEvent.click(screen.getByRole('button', { name: 'Generar páginas legales' }));

    // El diálogo de confirmación aparece
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain('Generar páginas legales');

    // El botón sigue mostrando su label normal (no "Generando…"): el submit real no se disparó
    expect(screen.getByRole('button', { name: 'Generar páginas legales' })).toBeTruthy();
    expect(screen.queryByText('Generando…')).toBeFalsy();
  });

  it('cerrar el ConfirmDialog con "Cancelar" no dispara el submit', async () => {
    const { container } = render(BrandLegalForm, { props: { ...DEFAULT_PROPS, onUpdate: () => {} } });

    await fireEvent.click(screen.getByRole('button', { name: 'Generar páginas legales' }));
    expect(container.querySelector('[role="dialog"]')).toBeTruthy();

    await fireEvent.click(screen.getByText('Cancelar'));

    expect(container.querySelector('[role="dialog"]')).toBeFalsy();
    expect(screen.queryByText('Generando…')).toBeFalsy();
  });
});
