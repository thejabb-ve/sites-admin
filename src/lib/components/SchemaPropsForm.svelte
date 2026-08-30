<script lang="ts">
	import { untrack }  from 'svelte';
	import { enhance }  from '$app/forms';
	import { toast }    from '$lib/toast.svelte';
	import { ADMIN_BLOCK_REGISTRY } from '$lib/blocks/adminRegistry';
	import { schemaToFields }        from '$lib/blocks/schemaToFields';
	import FieldControl              from './FieldControl.svelte';
	import Button                    from './Button.svelte';
	import type { ActionResult } from '@sveltejs/kit';

	let {
		entryKey,
		project,
		initialProps,
		breadcrumbLabel,
		heading,
		submitLabel,
		savedMessage,
	}: {
		entryKey:         'header' | 'footer';
		project:          { id: string; name: string };
		initialProps:     Record<string, unknown>;
		breadcrumbLabel:  string;
		heading:          string;
		submitLabel:      string;
		savedMessage:     string;
	} = $props();

	const entry  = $derived(ADMIN_BLOCK_REGISTRY[entryKey]!);
	const fields = $derived(schemaToFields(entry.schema).map(f => ({
		...f,
		...(entry.fieldOverrides?.[f.key] ?? {}),
		label: entry.fieldLabels?.[f.key] ?? f.key,
	})));

	let currentProps = $state<Record<string, unknown>>(
		untrack(() => JSON.parse(JSON.stringify(initialProps)) as Record<string, unknown>),
	);
	let saving = $state(false);
	let propsJson = $derived(JSON.stringify(currentProps));

	function updateProp(key: string, value: unknown) {
		currentProps = { ...currentProps, [key]: value };
	}

	function getPropValue(key: string): unknown {
		return key in currentProps ? currentProps[key] : (fields.find(f => f.key === key)?.defaultValue ?? null);
	}
</script>

<div class="space-y-6">
	<div class="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
		<a href="/dashboard" class="hover:text-gray-900">Proyectos</a>
		<span>/</span>
		<a href="/projects/{project.id}" class="hover:text-gray-900">{project.name}</a>
		<span>/</span>
		<a href="/projects/{project.id}/template" class="hover:text-gray-900">Plantilla</a>
		<span>/</span>
		<span class="text-gray-900 font-medium">{breadcrumbLabel}</span>
	</div>

	<h1 class="text-xl font-semibold text-gray-900">{heading}</h1>

	<form
		method="POST"
		action="?/save"
		use:enhance={() => {
			saving = true;
			return async ({ result, update }: { result: ActionResult; update: (opts?: { reset?: boolean }) => Promise<void> }) => {
				await update({ reset: false });
				saving = false;
				if (result.type === 'success') toast('success', savedMessage);
				else if (result.type === 'failure') toast('error', (result.data as Record<string, string>)?.error ?? 'Error al guardar.');
			};
		}}
		class="bg-white border border-gray-200 rounded-lg p-6 space-y-4"
	>
		<input type="hidden" name="props" value={propsJson} />

		{#each fields as field (field.key)}
			{@const inputId = `${entryKey}-${field.key}`}
			<div>
				<label for={inputId} class="block text-sm font-medium text-gray-700 mb-1">
					{field.label}{field.required ? ' *' : ''}
				</label>
				<FieldControl
					{field}
					id={inputId}
					size="md"
					value={getPropValue(field.key)}
					onUpdate={(v) => updateProp(field.key, v)}
				/>
			</div>
		{/each}

		<div class="flex justify-end pt-2 border-t border-gray-100">
			<Button type="submit" loading={saving} loadingLabel="Guardando…">{submitLabel}</Button>
		</div>
	</form>
</div>
