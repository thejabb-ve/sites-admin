<script lang="ts">
	import FieldControl       from './FieldControl.svelte';
	import type { FieldDef }  from '$lib/blocks/schemaToFields';

	let {
		field,
		value,
		onUpdate,
	}: {
		field:    FieldDef;
		value:    Record<string, unknown>;
		onUpdate: (v: Record<string, unknown>) => void;
	} = $props();

	function updateField(key: string, val: unknown) {
		onUpdate({ ...value, [key]: val });
	}
</script>

<div class="space-y-2 border border-border-subtle rounded-md p-3 bg-white">
	{#each field.subFields ?? [] as subField (subField.key)}
		{@const ctrlId = `noe-${field.key}-${subField.key}`}
		{@const val    = value[subField.key]}
		<div>
			<label for={ctrlId} class="block text-xs text-subtle mb-0.5">
				{subField.key}{subField.required ? ' *' : ''}
			</label>

			<FieldControl
				field={subField}
				id={ctrlId}
				value={val}
				onUpdate={(v) => updateField(subField.key, v)}
			/>
		</div>
	{/each}
</div>
