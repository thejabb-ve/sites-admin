export interface TextAreaState {
	value:          string;
	selectionStart: number;
	selectionEnd:   number;
}

export type Align = 'left' | 'center' | 'right';

/** Envuelve la selección actual con `marker` en ambos lados (negrita/cursiva). */
export function wrapInline(state: TextAreaState, marker: string): TextAreaState {
	const { value, selectionStart: start, selectionEnd: end } = state;
	const before   = value.slice(0, start);
	const selected = value.slice(start, end);
	const after    = value.slice(end);

	const newValue = before + marker + selected + marker + after;

	if (selected.length === 0) {
		const pos = start + marker.length;
		return { value: newValue, selectionStart: pos, selectionEnd: pos };
	}

	return {
		value: newValue,
		selectionStart: start + marker.length,
		selectionEnd:   start + marker.length + selected.length,
	};
}

export const toggleBold   = (s: TextAreaState): TextAreaState => wrapInline(s, '**');
export const toggleItalic = (s: TextAreaState): TextAreaState => wrapInline(s, '*');

const FENCE_LINE_RE = /^:::(left|center|right)$/;

/**
 * Si el bloque de líneas [lineStart, lineEnd) ya está directamente envuelto
 * por un fence de alineación (línea de apertura ":::align" justo antes, línea
 * de cierre ":::" justo después), devuelve las posiciones de esas dos líneas
 * — para reemplazar el align existente en vez de anidar un wrapper nuevo.
 */
function findEnclosingFence(value: string, lineStart: number, lineEnd: number) {
	if (lineStart < 1 || value[lineStart - 1] !== '\n') return undefined;
	const openEnd   = lineStart - 1;
	const openStart = value.lastIndexOf('\n', openEnd - 1) + 1;
	if (!FENCE_LINE_RE.test(value.slice(openStart, openEnd))) return undefined;

	if (value[lineEnd] !== '\n') return undefined;
	const closeStart = lineEnd + 1;
	const closeNextNl = value.indexOf('\n', closeStart);
	const closeEnd = closeNextNl === -1 ? value.length : closeNextNl;
	if (value.slice(closeStart, closeEnd) !== ':::') return undefined;

	return { openStart, openEnd, closeStart, closeEnd };
}

/**
 * Envuelve el bloque de líneas que contiene la selección (expandido a límites
 * de línea completa) con `:::align\n...\n:::`. Sin selección, inserta un
 * bloque vacío con el cursor dentro. Si el bloque ya está envuelto por un
 * fence de alineación, reemplaza su align en vez de anidar un wrapper nuevo
 * (evita `:::center\n:::right\n...\n:::\n:::` al re-aplicar alineación).
 */
export function wrapBlockAlign(state: TextAreaState, align: Align): TextAreaState {
	const { value, selectionStart, selectionEnd } = state;

	const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
	const nextNl    = value.indexOf('\n', selectionEnd);
	const lineEnd   = nextNl === -1 ? value.length : nextNl;

	const enclosing = findEnclosingFence(value, lineStart, lineEnd);
	if (enclosing) {
		const { openStart, openEnd, closeStart, closeEnd } = enclosing;
		const newOpen = `:::${align}`;
		const newValue = value.slice(0, openStart) + newOpen + value.slice(openEnd, closeStart) + ':::' + value.slice(closeEnd);
		const shift = newOpen.length - (openEnd - openStart);
		return {
			value: newValue,
			selectionStart: lineStart + shift,
			selectionEnd:   lineEnd + shift,
		};
	}

	const before = value.slice(0, lineStart);
	const block  = value.slice(lineStart, lineEnd);
	const after  = value.slice(lineEnd);

	const open  = `:::${align}\n`;
	const close = '\n:::';

	if (block.length === 0) {
		const newValue = before + open + close + after;
		const pos = lineStart + open.length;
		return { value: newValue, selectionStart: pos, selectionEnd: pos };
	}

	const newValue = before + open + block + close + after;
	return {
		value: newValue,
		selectionStart: lineStart + open.length,
		selectionEnd:   lineStart + open.length + block.length,
	};
}
