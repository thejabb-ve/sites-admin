<script lang="ts">
	import NestedObjectEditor from './NestedObjectEditor.svelte';
	import ArrayObjectEditor  from './ArrayObjectEditor.svelte';
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

<div class="space-y-2 border border-gray-200 rounded-md p-3 bg-white">
	{#each field.subFields ?? [] as subField (subField.key)}
		{@const ctrlId = `noe-${field.key}-${subField.key}`}
		{@const val    = value[subField.key]}
		<div>
			<label for={ctrlId} class="block text-xs text-gray-500 mb-0.5">
				{subField.key}{subField.required ? ' *' : ''}
			</label>

			{#if subField.inputType === 'nested-object'}
				<div class="ml-2 border-l border-gray-200 pl-2">
					<NestedObjectEditor
						field={subField}
						value={(val as Record<string, unknown> ?? {})}
						onUpdate={(v: Record<string, unknown>) => updateField(subField.key, v)}
					/>
				</div>

			{:else if subField.inputType === 'array-objects'}
				<div class="ml-2 border-l border-gray-200 pl-2">
					<ArrayObjectEditor
						field={subField}
						value={(val as Record<string, unknown>[] ?? [])}
						onUpdate={(items: Record<string, unknown>[]) => updateField(subField.key, items)}
					/>
				</div>

			{:else if subField.inputType === 'array-strings'}
				<textarea
					id={ctrlId}
					rows="2"
					value={(val as string[] ?? []).join('\n')}
					oninput={(e) => updateField(subField.key, (e.target as HTMLTextAreaElement).value.split('\n').filter((s: string) => s.trim() !== ''))}
					class="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono resize-y"
					placeholder="Un elemento por línea"
				></textarea>

			{:else if subField.inputType === 'checkbox'}
				<input
					id={ctrlId}
					type="checkbox"
					checked={Boolean(val ?? false)}
					onchange={(e) => updateField(subField.key, (e.target as HTMLInputElement).checked)}
					class="w-4 h-4 text-blue-600 border-gray-300 rounded"
				/>

			{:else if subField.inputType === 'select'}
				<select
					id={ctrlId}
					value={String(val ?? subField.options?.[0] ?? '')}
					onchange={(e) => updateField(subField.key, (e.target as HTMLSelectElement).value)}
					class="w-full border border-gray-200 rounded px-2 py-1 text-xs"
				>
					{#each subField.options ?? [] as opt (opt)}
						<option value={opt}>{opt}</option>
					{/each}
				</select>

			{:else if subField.inputType === 'number'}
				<input
					id={ctrlId}
					type="number"
					value={Number(val ?? 0)}
					oninput={(e) => updateField(subField.key, Number((e.target as HTMLInputElement).value))}
					class="w-full border border-gray-200 rounded px-2 py-1 text-xs"
				/>

			{:else if subField.inputType === 'json'}
				<textarea
					id={ctrlId}
					rows="2"
					value={JSON.stringify(val ?? {}, null, 2)}
					oninput={(e) => {
						try { updateField(subField.key, JSON.parse((e.target as HTMLTextAreaElement).value)); } catch { /* esperar JSON válido */ }
					}}
					class="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono resize-y"
					placeholder="&#123;&#125;"
				></textarea>

			{:else if subField.inputType === 'textarea'}
				<textarea
					id={ctrlId}
					rows="3"
					oninput={(e) => updateField(subField.key, (e.target as HTMLTextAreaElement).value)}
					class="w-full border border-gray-200 rounded px-2 py-1 text-sm resize-y"
				>{String(val ?? '')}</textarea>

			{:else}
				<input
					id={ctrlId}
					type="text"
					value={String(val ?? '')}
					oninput={(e) => updateField(subField.key, (e.target as HTMLInputElement).value)}
					class="w-full border border-gray-200 rounded px-2 py-1 text-xs"
					placeholder={subField.key}
				/>
			{/if}
		</div>
	{/each}
</div>
