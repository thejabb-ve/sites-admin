<script lang="ts">
	import { untrack }  from 'svelte';
	import { enhance }  from '$app/forms';
	import { toast }    from '$lib/toast.svelte';
	import { ADMIN_BLOCK_REGISTRY } from '$lib/blocks/adminRegistry';
	import { schemaToFields }        from '$lib/blocks/schemaToFields';
	import FieldControl              from './FieldControl.svelte';
	import Button                    from './Button.svelte';
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
		onSaved:      (updatedProps: Record<string, unknown>) => void;
	} = $props();

	const entry  = $derived(ADMIN_BLOCK_REGISTRY[blockType]);

	// Combina campos auto-generados con overrides del registry
	const fields = $derived(() => {
		if (!entry) return [];
		const base         = schemaToFields(entry.schema);
		const overrides    = entry.fieldOverrides ?? {};
		const itemOverrides = entry.itemFieldOverrides ?? {};
		return base.map(f => {
			let merged = overrides[f.key] ? { ...f, ...overrides[f.key] } : f;
			if (merged.inputType === 'array-objects' && itemOverrides[merged.key] && merged.itemFields) {
				const iov = itemOverrides[merged.key]!;
				merged = {
					...merged,
					itemFields: merged.itemFields.map(sf =>
						iov[sf.key] ? { ...sf, ...iov[sf.key] } : sf,
					),
				};
			}
			return merged;
		});
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

<div class="border-t border-border-faint bg-surface-muted rounded-b-lg p-4">
	{#if !entry}
		<p class="text-sm text-danger">Tipo de bloque desconocido: {blockType}</p>
	{:else if fields().length === 0}
		<p class="text-sm text-faint">Este bloque no tiene props configurables.</p>
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
						onSaved(currentProps);
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
					<label for={inputId} class="block text-xs font-medium text-muted mb-1">
						{entry.fieldLabels?.[field.key] ?? field.key}{field.required ? ' *' : ''}
					</label>

					<FieldControl
						{field}
						id={inputId}
						size="lg"
						value={val}
						onUpdate={(v) => updateProp(field.key, v)}
					/>
				</div>
			{/each}

			<div class="flex items-center justify-end gap-3 pt-2 border-t border-border-subtle">
				<button
					type="button"
					onclick={onClose}
					class="text-sm text-subtle hover:text-ink transition-colors"
				>
					Cancelar
				</button>
				<Button type="submit" loading={saving}>Guardar</Button>
			</div>
		</form>
	{/if}
</div>
