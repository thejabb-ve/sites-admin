import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';
import TextareaToolbar from './TextareaToolbar.svelte';

afterEach(() => cleanup());

describe('TextareaToolbar', () => {
	it('renderiza los 5 botones con su aria-label', () => {
		render(TextareaToolbar, { props: { onAction: () => {} } });
		expect(screen.getByLabelText('Negrita')).toBeTruthy();
		expect(screen.getByLabelText('Cursiva')).toBeTruthy();
		expect(screen.getByLabelText('Alinear a la izquierda')).toBeTruthy();
		expect(screen.getByLabelText('Centrar')).toBeTruthy();
		expect(screen.getByLabelText('Alinear a la derecha')).toBeTruthy();
	});

	it('cada botón invoca onAction con la acción correspondiente', async () => {
		const onAction = mock(() => {});
		render(TextareaToolbar, { props: { onAction } });

		await fireEvent.click(screen.getByLabelText('Negrita'));
		await fireEvent.click(screen.getByLabelText('Cursiva'));
		await fireEvent.click(screen.getByLabelText('Alinear a la izquierda'));
		await fireEvent.click(screen.getByLabelText('Centrar'));
		await fireEvent.click(screen.getByLabelText('Alinear a la derecha'));

		const calls = (onAction.mock.calls as unknown[][]).map((c) => c[0]);
		expect(calls).toEqual(['bold', 'italic', 'align-left', 'align-center', 'align-right']);
	});

	it('mousedown en un botón previene la pérdida de foco (preventDefault)', () => {
		render(TextareaToolbar, { props: { onAction: () => {} } });
		const btn = screen.getByLabelText('Negrita');
		const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
		btn.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
	});
});
