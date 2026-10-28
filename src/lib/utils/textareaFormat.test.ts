import { describe, it, expect } from 'bun:test';
import { toggleBold, toggleItalic, wrapBlockAlign } from './textareaFormat';

describe('toggleBold / toggleItalic', () => {
	it('sin selección inserta marcadores vacíos con el cursor entre medio', () => {
		const result = toggleBold({ value: 'hola mundo', selectionStart: 4, selectionEnd: 4 });
		expect(result.value).toBe('hola**** mundo');
		expect(result.selectionStart).toBe(6);
		expect(result.selectionEnd).toBe(6);
	});

	it('bold con selección envuelve y re-selecciona el texto (sin marcadores)', () => {
		const result = toggleBold({ value: 'hola mundo', selectionStart: 5, selectionEnd: 10 });
		expect(result.value).toBe('hola **mundo**');
		expect(result.selectionStart).toBe(7);
		expect(result.selectionEnd).toBe(12);
		expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe('mundo');
	});

	it('italic con selección al inicio del string', () => {
		const result = toggleItalic({ value: 'hola mundo', selectionStart: 0, selectionEnd: 4 });
		expect(result.value).toBe('*hola* mundo');
	});

	it('bold con selección al final del string', () => {
		const result = toggleBold({ value: 'hola mundo', selectionStart: 5, selectionEnd: 10 });
		expect(result.value.endsWith('**')).toBe(true);
	});

	it('italic sin selección en string vacío', () => {
		const result = toggleItalic({ value: '', selectionStart: 0, selectionEnd: 0 });
		expect(result.value).toBe('**');
		expect(result.selectionStart).toBe(1);
		expect(result.selectionEnd).toBe(1);
	});
});

describe('wrapBlockAlign', () => {
	it('sin selección inserta bloque vacío con el cursor dentro', () => {
		const result = wrapBlockAlign({ value: '', selectionStart: 0, selectionEnd: 0 }, 'center');
		expect(result.value).toBe(':::center\n\n:::');
		expect(result.selectionStart).toBe(':::center\n'.length);
		expect(result.selectionEnd).toBe(':::center\n'.length);
	});

	it('envuelve una sola línea seleccionada', () => {
		const result = wrapBlockAlign({ value: 'Hola', selectionStart: 0, selectionEnd: 4 }, 'right');
		expect(result.value).toBe(':::right\nHola\n:::');
	});

	it('expande la selección a límites de línea completa (selección parcial en medio de la línea)', () => {
		const result = wrapBlockAlign({ value: 'Hola mundo', selectionStart: 2, selectionEnd: 6 }, 'left');
		expect(result.value).toBe(':::left\nHola mundo\n:::');
	});

	it('envuelve selección multilínea completa', () => {
		const value = 'Línea A\nLínea B\nLínea C';
		const start = value.indexOf('Línea B');
		const end   = start + 'Línea B'.length;
		const result = wrapBlockAlign({ value, selectionStart: start, selectionEnd: end }, 'center');
		expect(result.value).toBe('Línea A\n:::center\nLínea B\n:::\nLínea C');
	});

	it('re-aplicar alineación sobre un bloque ya envuelto reemplaza el align en vez de anidar', () => {
		const wrapped = wrapBlockAlign({ value: 'Hola', selectionStart: 0, selectionEnd: 4 }, 'center');
		expect(wrapped.value).toBe(':::center\nHola\n:::');

		// El usuario re-selecciona solo la línea interna ("Hola") y cambia el align.
		const innerStart = wrapped.value.indexOf('Hola');
		const innerEnd   = innerStart + 'Hola'.length;
		const result = wrapBlockAlign(
			{ value: wrapped.value, selectionStart: innerStart, selectionEnd: innerEnd },
			'right',
		);
		expect(result.value).toBe(':::right\nHola\n:::');
		expect(result.value.match(/:::/g)?.length).toBe(2); // sin anidar, un solo par de fences
	});

	it('re-aplicar el mismo align sobre un bloque ya envuelto no lo duplica', () => {
		const wrapped = wrapBlockAlign({ value: 'Hola', selectionStart: 0, selectionEnd: 4 }, 'center');
		const innerStart = wrapped.value.indexOf('Hola');
		const innerEnd   = innerStart + 'Hola'.length;
		const result = wrapBlockAlign(
			{ value: wrapped.value, selectionStart: innerStart, selectionEnd: innerEnd },
			'center',
		);
		expect(result.value).toBe(':::center\nHola\n:::');
	});

	it('re-aplicar alineación sobre un bloque envuelto multilínea reemplaza el align', () => {
		const wrapped = wrapBlockAlign(
			{ value: 'Línea 1\nLínea 2', selectionStart: 0, selectionEnd: 15 },
			'left',
		);
		expect(wrapped.value).toBe(':::left\nLínea 1\nLínea 2\n:::');

		const innerStart = wrapped.value.indexOf('Línea 1');
		const innerEnd   = wrapped.value.indexOf('Línea 2') + 'Línea 2'.length;
		const result = wrapBlockAlign(
			{ value: wrapped.value, selectionStart: innerStart, selectionEnd: innerEnd },
			'right',
		);
		expect(result.value).toBe(':::right\nLínea 1\nLínea 2\n:::');
	});
});
