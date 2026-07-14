<script lang="ts">
	import { untrack }  from 'svelte';
	import { enhance }  from '$app/forms';
	import { toast }    from '$lib/toast.svelte';
	import { ADMIN_BLOCK_REGISTRY } from '$lib/blocks/adminRegistry';
	import { schemaToFields }        from '$lib/blocks/schemaToFields';
	import ArrayObjectEditor         from './ArrayObjectEditor.svelte';
	import NestedObjectEditor        from './NestedObjectEditor.svelte';
	import type { ActionResult }    from '@sveltejs/kit';

	let {
		blockId,
		blockType,
		initialProps,
		onClose,
		onSaved,
	}: {
		blockId:      string;
		blockType:    string;
		initialProps: Record<string, unknown>;
		onClose:      () => void;
		onSaved:      () => void;
	} = $props();

	const entry  = $derived(ADMIN_BLOCK_REGISTRY[blockType]);

	// Combina campos auto-generados con overrides del registry
	const fields = $derived(() => {
		if (!entry) return [];
		const base     = schemaToFields(entry.schema);
		const overrides = entry.fieldOverrides ?? {};
		return base.map(f => overrides[f.key] ? { ...f, ...overrides[f.key] } : f);
	});

	// JSON.parse/stringify para evitar el error de structuredClone con Proxies de Svelte 5
	let currentProps = $state<Record<string, unknown>>(
		untrack(() => JSON.parse(JSON.stringify(initialProps)) as Record<string, unknown>),
	);
	let saving = $state(false);

	let propsJson = $derived(JSON.stringify(currentProps));

	function updateProp(key: string, value: unknown) {
		currentProps = { ...currentProps, [key]: value };
	}

	function getPropValue(key: string): unknown {
		return key in currentProps
			? currentProps[key]
			: (fields().find(f => f.key === key)?.defaultValue ?? null);
	}
</script>

<div class="border-t border-gray-100 bg-gray-50 rounded-b-lg p-4">
	{#if !entry}
		<p class="text-sm text-red-500">Tipo de bloque desconocido: {blockType}</p>
	{:else if fields().length === 0}
		<p class="text-sm text-gray-400">Este bloque no tiene props configurables.</p>
	{:else}
		<form
			method="POST"
			action="?/updateProps"
			use:enhance={() => {
				saving = true;
				return async ({ result, update }: { result: ActionResult; update: (opts?: { reset?: boolean }) => Promise<void> }) => {
					await update({ reset: false });
					saving = false;
					if (result.type === 'success') {
						toast('success', 'Bloque guardado.');
						onSaved();
					} else if (result.type === 'failure') {
						toast('error', (result.data as Record<string, string>)?.error ?? 'Error al guardar.');
					}
				};
			}}
			class="space-y-3"
		>
			<input type="hidden" name="block_id"   value={blockId} />
			<input type="hidden" name="block_type" value={blockType} />
			<input type="hidden" name="props"      value={propsJson} />

			{#each fields() as field (field.key)}
				{@const val     = getPropValue(field.key)}
				{@const inputId = `${blockId}-${field.key}`}
				<div>
					<label for={inputId} class="block text-xs font-medium text-gray-600 mb-1">
						{entry.fieldLabels?.[field.key] ?? field.key}{field.required ? ' *' : ''}
					</label>

					{#if field.inputType === 'nested-object'}
						<NestedObjectEditor
							{field}
							value={(val ?? {}) as Record<string, unknown>}
							onUpdate={(v: Record<string, unknown>) => updateProp(field.key, v)}
						/>

					{:else if field.inputType === 'array-objects'}
						<ArrayObjectEditor
							{field}
							value={(val ?? []) as Record<string, unknown>[]}
							onUpdate={(items: Record<string, unknown>[]) => updateProp(field.key, items)}
						/>

					{:else if field.inputType === 'array-strings'}
						<textarea
							id={inputId}
							rows="3"
							value={(val as string[] ?? []).join('\n')}
							oninput={(e) => updateProp(field.key, (e.target as HTMLTextAreaElement).value.split('\n').filter((s: string) => s.trim() !== ''))}
							class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
							placeholder="Un elemento por línea"
						></textarea>

					{:else if field.inputType === 'json'}
						<textarea
							id={inputId}
							rows="4"
							value={JSON.stringify(val ?? (Array.isArray(field.defaultValue) ? [] : {}), null, 2)}
							oninput={(e) => {
								try {
									updateProp(field.key, JSON.parse((e.target as HTMLTextAreaElement).value));
								} catch {
									/* esperar JSON válido */
								}
							}}
							class="w-full border border-gray-300 rounded-md px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
							placeholder="JSON…"
						></textarea>

					{:else if field.inputType === 'textarea'}
						<textarea
							id={inputId}
							rows="6"
							oninput={(e) => updateProp(field.key, (e.target as HTMLTextAreaElement).value)}
							class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
						>{String(val ?? field.defaultValue ?? '')}</textarea>

					{:else if field.inputType === 'select'}
						<select
							id={inputId}
							value={String(val ?? field.options?.[0] ?? '')}
							onchange={(e) => updateProp(field.key, (e.target as HTMLSelectElement).value)}
							class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							{#each field.options ?? [] as opt (opt)}
								<option value={opt}>{opt}</option>
							{/each}
						</select>

					{:else if field.inputType === 'checkbox'}
						<input
							id={inputId}
							type="checkbox"
							checked={Boolean(val ?? false)}
							onchange={(e) => updateProp(field.key, (e.target as HTMLInputElement).checked)}
							class="w-4 h-4 text-blue-600 border-gray-300 rounded"
						/>

					{:else if field.inputType === 'number'}
						<input
							id={inputId}
							type="number"
							value={Number(val ?? field.defaultValue ?? 0)}
							oninput={(e) => updateProp(field.key, Number((e.target as HTMLInputElement).value))}
							class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>

					{:else}
						<input
							id={inputId}
							type="text"
							value={String(val ?? field.defaultValue ?? '')}
							oninput={(e) => updateProp(field.key, (e.target as HTMLInputElement).value)}
							class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					{/if}
				</div>
			{/each}

			<div class="flex items-center justify-end gap-3 pt-2 border-t border-gray-200">
				<button
					type="button"
					onclick={onClose}
					class="text-sm text-gray-500 hover:text-gray-900 transition-colors"
				>
					Cancelar
				</button>
				<button
					type="submit"
					disabled={saving}
					class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
				>
					{saving ? 'Guardando…' : 'Guardar'}
				</button>
			</div>
		</form>
	{/if}
</div>
