import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, fireEvent, cleanup } from '@testing-library/svelte';

afterEach(() => cleanup());
import HexColorPicker from './HexColorPicker.svelte';

describe('HexColorPicker — renderizado', () => {
  it('el valor inicial (oklch) se refleja en el input hex', () => {
    // oklch(0.7 0.15 250) equivale aproximadamente a un azul; solo comprobamos
    // que el input de texto arranca con un hex válido de 7 caracteres (#rrggbb)
    const { container } = render(HexColorPicker, {
      props: { value: 'oklch(0.7 0.15 250)', onUpdate: () => {} },
    });
    const textInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(textInput.value).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('renderiza el input nativo de color con el mismo hex', () => {
    const { container } = render(HexColorPicker, {
      props: { value: 'oklch(0.7 0.15 250)', onUpdate: () => {} },
    });
    const colorInput = container.querySelector('input[type="color"]') as HTMLInputElement;
    const textInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    expect(colorInput.value).toBe(textInput.value);
  });
});

describe('HexColorPicker — callbacks', () => {
  it('escribir un hex válido dispara onUpdate con un string oklch', async () => {
    const onUpdate = mock(() => {});
    const { container } = render(HexColorPicker, {
      props: { value: 'oklch(0.7 0.15 250)', onUpdate },
    });

    const textInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    textInput.value = '#ff0000';
    await fireEvent.input(textInput);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [called] = onUpdate.mock.calls[0] as unknown as [string];
    expect(called).toMatch(/^oklch\(/);
  });

  it('cambiar el input de color nativo dispara onUpdate', async () => {
    const onUpdate = mock(() => {});
    const { container } = render(HexColorPicker, {
      props: { value: 'oklch(0.7 0.15 250)', onUpdate },
    });

    const colorInput = container.querySelector('input[type="color"]') as HTMLInputElement;
    colorInput.value = '#00ff00';
    await fireEvent.input(colorInput);

    expect(onUpdate).toHaveBeenCalledTimes(1);
  });
});

describe('HexColorPicker — validación de hex inválido', () => {
  it('un hex inválido no dispara onUpdate', async () => {
    const onUpdate = mock(() => {});
    const { container } = render(HexColorPicker, {
      props: { value: 'oklch(0.7 0.15 250)', onUpdate },
    });

    const textInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    textInput.value = '#zzz';
    await fireEvent.input(textInput);

    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('un hex inválido marca el input con estilo de error (borde rojo)', async () => {
    const { container } = render(HexColorPicker, {
      props: { value: 'oklch(0.7 0.15 250)', onUpdate: () => {} },
    });

    const textInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    textInput.value = 'no-es-un-hex';
    await fireEvent.input(textInput);

    expect(textInput.className).toContain('border-red-400');
  });

  it('corregir un hex inválido a uno válido vuelve a disparar onUpdate y quita el error', async () => {
    const onUpdate = mock(() => {});
    const { container } = render(HexColorPicker, {
      props: { value: 'oklch(0.7 0.15 250)', onUpdate },
    });

    const textInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    textInput.value = 'invalido';
    await fireEvent.input(textInput);
    expect(onUpdate).not.toHaveBeenCalled();

    textInput.value = '#123abc';
    await fireEvent.input(textInput);

    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(textInput.className).not.toContain('border-red-400');
  });
});
