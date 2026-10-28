<script lang="ts">
	export type ToolbarAction = 'bold' | 'italic' | 'align-left' | 'align-center' | 'align-right';

	let { onAction }: { onAction: (action: ToolbarAction) => void } = $props();

	// Evita que el <textarea> pierda el foco/selección antes del click
	// (mousedown dispara blur antes que click).
	function noFocusLoss(e: MouseEvent) {
		e.preventDefault();
	}

	const BUTTONS: { action: ToolbarAction; label: string; glyph: string }[] = [
		{ action: 'bold',          label: 'Negrita',                 glyph: 'B' },
		{ action: 'italic',        label: 'Cursiva',                 glyph: 'I' },
		{ action: 'align-left',    label: 'Alinear a la izquierda',  glyph: '⟸' },
		{ action: 'align-center',  label: 'Centrar',                 glyph: '≡' },
		{ action: 'align-right',   label: 'Alinear a la derecha',    glyph: '⟹' },
	];

	const btnCls = 'px-2 py-1 text-xs border border-border-subtle rounded hover:bg-surface';
</script>

<div class="flex gap-1 mb-1" role="toolbar" aria-label="Formato de texto">
	{#each BUTTONS as { action, label, glyph } (action)}
		<button type="button" class={btnCls} onmousedown={noFocusLoss} onclick={() => onAction(action)} aria-label={label}>
			{glyph}
		</button>
	{/each}
</div>
