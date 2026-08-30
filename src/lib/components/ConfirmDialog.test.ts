import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

afterEach(() => cleanup());
import ConfirmDialog from './ConfirmDialog.svelte';

describe('ConfirmDialog — renderizado', () => {
  it('no renderiza contenido cuando open=false', () => {
    const { container } = render(ConfirmDialog, {
      props: { open: false, message: 'Mensaje', onConfirm: () => {} },
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('renderiza título y mensaje cuando open=true', () => {
    render(ConfirmDialog, {
      props: { open: true, title: 'Título custom', message: 'Mensaje de prueba', onConfirm: () => {} },
    });
    expect(screen.getByText('Título custom')).toBeTruthy();
    expect(screen.getByText('Mensaje de prueba')).toBeTruthy();
  });

  it('usa el título por defecto si no se especifica', () => {
    render(ConfirmDialog, {
      props: { open: true, message: 'Mensaje', onConfirm: () => {} },
    });
    expect(screen.getByText('Confirmar acción')).toBeTruthy();
  });

  it('confirmLabel custom se muestra en el botón de confirmar', () => {
    render(ConfirmDialog, {
      props: { open: true, message: 'Mensaje', confirmLabel: 'Eliminar', onConfirm: () => {} },
    });
    expect(screen.getByText('Eliminar')).toBeTruthy();
  });

  it('confirmLabel por defecto es "Confirmar"', () => {
    render(ConfirmDialog, {
      props: { open: true, message: 'Mensaje', onConfirm: () => {} },
    });
    expect(screen.getByText('Confirmar')).toBeTruthy();
  });
});

describe('ConfirmDialog — callbacks', () => {
  it('onConfirm se dispara al hacer click en confirmar', async () => {
    const onConfirm = mock(() => {});
    render(ConfirmDialog, {
      props: { open: true, message: 'Mensaje', onConfirm },
    });

    await fireEvent.click(screen.getByText('Confirmar'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('cancelar no dispara onConfirm', async () => {
    const onConfirm = mock(() => {});
    render(ConfirmDialog, {
      props: { open: true, message: 'Mensaje', onConfirm },
    });

    await fireEvent.click(screen.getByText('Cancelar'));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('cancelar dispara onCancel si se proporciona', async () => {
    const onCancel = mock(() => {});
    render(ConfirmDialog, {
      props: { open: true, message: 'Mensaje', onConfirm: () => {}, onCancel },
    });

    await fireEvent.click(screen.getByText('Cancelar'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('click en el backdrop no dispara onConfirm', async () => {
    const onConfirm = mock(() => {});
    const { container } = render(ConfirmDialog, {
      props: { open: true, message: 'Mensaje', onConfirm },
    });

    const backdrop = container.querySelector('[role="presentation"]') as HTMLElement;
    await fireEvent.click(backdrop);

    expect(onConfirm).not.toHaveBeenCalled();
  });
});
