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
</script>

<div class="space-y-2">
	{#each value as item, i (i)}
		<div class="border border-border-subtle rounded-md p-3 relative bg-white">
			<button
				type="button"
				onclick={() => removeItem(i)}
				class="absolute top-2 right-2 text-faint hover:text-danger text-xs px-1"
				aria-label="Eliminar elemento"
			>✕</button>

			<div class="space-y-2 pr-6">
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
