<script lang="ts">
	import FieldControl       from './FieldControl.svelte';
	import type { FieldDef }  from '$lib/blocks/schemaToFields';

	let {
		field,
		value,
		onUpdate,
	}: {
		field:    FieldDef;
		value:    Record<string, unknown>[];
		onUpdate: (items: Record<string, unknown>[]) => void;
	} = $props();

	function makeEmpty(): Record<string, unknown> {
		const item: Record<string, unknown> = {};
		for (const f of field.itemFields ?? []) {
			item[f.key] = f.defaultValue ?? (f.inputType === 'array-strings' || f.inputType === 'array-objects' ? [] : f.inputType === 'checkbox' ? false : '');
		}
		return item;
	}

	function addItem() { onUpdate([...value, makeEmpty()]); }
	function removeItem(i: number) { onUpdate(value.filter((_, idx) => idx !== i)); }
	function updateItemField(i: number, key: string, val: unknown) {
		onUpdate(value.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
	}

	// ── Drag & drop (reordenar) ───────────────────────────────────────────────
	let dragIndex   = $state<number | null>(null);
	let dragOverIdx = $state<number | null>(null);

	function handleDragStart(i: number) { dragIndex = i; }
	function handleDragOver(e: DragEvent, i: number) { e.preventDefault(); dragOverIdx = i; }
	function handleDragLeave() { dragOverIdx = null; }

	function handleDrop(targetIdx: number) {
		if (dragIndex === null || dragIndex === targetIdx) {
			dragIndex   = null;
			dragOverIdx = null;
			return;
		}
		const reordered = [...value];
		const [moved] = reordered.splice(dragIndex, 1);
		reordered.splice(targetIdx, 0, moved!);
		onUpdate(reordered);
		dragIndex   = null;
		dragOverIdx = null;
	}

	function handleDragEnd() {
		dragIndex   = null;
		dragOverIdx = null;
	}
</script>

<div class="space-y-2" role="list">
	{#each value as item, i (i)}
		<div
			role="listitem"
			draggable="true"
			ondragstart={() => handleDragStart(i)}
			ondragover={(e) => handleDragOver(e, i)}
			ondragleave={handleDragLeave}
			ondrop={() => handleDrop(i)}
			ondragend={handleDragEnd}
			class="border rounded-md p-3 bg-white transition-colors
				{dragOverIdx === i && dragIndex !== i
					? 'border-blue-400 ring-1 ring-blue-400'
					: 'border-border-subtle'}"
		>
			<div class="flex items-center justify-between mb-1">
				<span class="text-faint cursor-grab select-none text-lg leading-none" aria-hidden="true">⠿</span>
				<button
					type="button"
					onclick={() => removeItem(i)}
					class="text-faint hover:text-danger text-xs px-1"
					aria-label="Eliminar elemento"
				>✕</button>
			</div>

			<div class="space-y-2">
				{#each field.itemFields ?? [] as subField (subField.key)}
					{@const ctrlId = `aoe-${i}-${subField.key}`}
					<div>
						<label for={ctrlId} class="block text-xs text-subtle mb-0.5">
							{subField.key}{subField.required ? ' *' : ''}
						</label>

						<FieldControl
							field={subField}
							id={ctrlId}
							value={item[subField.key]}
							onUpdate={(v) => updateItemField(i, subField.key, v)}
						/>
					</div>
				{/each}
			</div>
		</div>
	{/each}

	<button
		type="button"
		onclick={addItem}
		class="w-full text-xs text-subtle border border-dashed border-border rounded-lg py-2 hover:border-faint hover:text-body transition-colors"
	>
		+ Añadir elemento
	</button>
</div>
