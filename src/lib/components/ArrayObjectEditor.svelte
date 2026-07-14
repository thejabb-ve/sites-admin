<script lang="ts">
	import ArrayObjectEditor  from './ArrayObjectEditor.svelte';
	import NestedObjectEditor from './NestedObjectEditor.svelte';
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
		<div class="border border-gray-200 rounded-md p-3 relative bg-white">
			<button
				type="button"
				onclick={() => removeItem(i)}
				class="absolute top-2 right-2 text-gray-300 hover:text-red-500 text-xs px-1"
				aria-label="Eliminar elemento"
			>✕</button>

			<div class="space-y-2 pr-6">
				{#each field.itemFields ?? [] as subField (subField.key)}
					{@const ctrlId = `aoe-${i}-${subField.key}`}
					<div>
						<label for={ctrlId} class="block text-xs text-gray-500 mb-0.5">
							{subField.key}{subField.required ? ' *' : ''}
						</label>

						{#if subField.inputType === 'nested-object'}
							<div class="ml-2 border-l border-gray-200 pl-2">
								<NestedObjectEditor
									field={subField}
									value={(item[subField.key] as Record<string, unknown> ?? {})}
									onUpdate={(v: Record<string, unknown>) => updateItemField(i, subField.key, v)}
								/>
							</div>

						{:else if subField.inputType === 'array-strings'}
							<textarea
								id={ctrlId}
								rows="2"
								value={(item[subField.key] as string[] ?? []).join('\n')}
								oninput={(e) => updateItemField(i, subField.key, (e.target as HTMLTextAreaElement).value.split('\n').filter((s: string) => s.trim() !== ''))}
								class="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono resize-y"
								placeholder="Un elemento por línea"
							></textarea>

						{:else if subField.inputType === 'array-objects'}
							<div class="ml-2 border-l border-gray-200 pl-2">
								<ArrayObjectEditor
									field={subField}
									value={(item[subField.key] as Record<string, unknown>[] ?? [])}
									onUpdate={(items: Record<string, unknown>[]) => updateItemField(i, subField.key, items)}
								/>
							</div>

						{:else if subField.inputType === 'checkbox'}
							<input
								id={ctrlId}
								type="checkbox"
								checked={Boolean(item[subField.key] ?? false)}
								onchange={(e) => updateItemField(i, subField.key, (e.target as HTMLInputElement).checked)}
								class="w-4 h-4 text-blue-600 border-gray-300 rounded"
							/>

						{:else if subField.inputType === 'select'}
							<select
								id={ctrlId}
								value={String(item[subField.key] ?? subField.options?.[0] ?? '')}
								onchange={(e) => updateItemField(i, subField.key, (e.target as HTMLSelectElement).value)}
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
								value={Number(item[subField.key] ?? 0)}
								oninput={(e) => updateItemField(i, subField.key, Number((e.target as HTMLInputElement).value))}
								class="w-full border border-gray-200 rounded px-2 py-1 text-xs"
							/>

						{:else if subField.inputType === 'json'}
							<textarea
								id={ctrlId}
								rows="2"
								value={JSON.stringify(item[subField.key] ?? {}, null, 2)}
								oninput={(e) => {
									try { updateItemField(i, subField.key, JSON.parse((e.target as HTMLTextAreaElement).value)); } catch { /* esperar JSON válido */ }
								}}
								class="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono resize-y"
								placeholder="&#123;&#125;"
							></textarea>

						{:else if subField.inputType === 'textarea'}
							<textarea
								id={ctrlId}
								rows="3"
								oninput={(e) => updateItemField(i, subField.key, (e.target as HTMLTextAreaElement).value)}
								class="w-full border border-gray-200 rounded px-2 py-1 text-sm resize-y"
							>{String(item[subField.key] ?? '')}</textarea>

						{:else}
							<input
								id={ctrlId}
								type="text"
								value={String(item[subField.key] ?? '')}
								oninput={(e) => updateItemField(i, subField.key, (e.target as HTMLInputElement).value)}
								class="w-full border border-gray-200 rounded px-2 py-1 text-xs"
								placeholder={subField.key}
							/>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/each}

	<button
		type="button"
		onclick={addItem}
		class="w-full text-xs text-gray-500 border border-dashed border-gray-300 rounded-md py-2 hover:border-gray-400 hover:text-gray-700 transition-colors"
	>
		+ Añadir elemento
	</button>
</div>
