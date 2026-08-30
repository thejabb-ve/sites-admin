<script lang="ts">
	import NestedObjectEditor from './NestedObjectEditor.svelte';
	import ArrayObjectEditor  from './ArrayObjectEditor.svelte';
	import AssetPicker        from './AssetPicker.svelte';
	import type { FieldDef }  from '$lib/blocks/schemaToFields';

	let {
		field,
		value,
		onUpdate,
		id,
		size = 'sm',
		textareaRows,
	}: {
		field:    FieldDef;
		value:    unknown;
		onUpdate: (v: unknown) => void;
		id:       string;
		/** 'sm' = editores anidados (compacto), 'md' = formularios de página (header/footer), 'lg' = panel de props de bloque (con focus ring) */
		size?:         'sm' | 'md' | 'lg';
		textareaRows?: number;
	} = $props();

	const inputCls    = $derived(size === 'lg'
		? 'w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent'
		: size === 'md'
		? 'w-full border border-border rounded-md px-3 py-2 text-sm'
		: 'w-full border border-border-subtle rounded px-2 py-1 text-xs');
	const textareaCls = $derived(size === 'lg'
		? 'w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y'
		: size === 'md'
		? 'w-full border border-border rounded-md px-3 py-2 text-sm resize-y'
		: 'w-full border border-border-subtle rounded px-2 py-1 text-sm resize-y');
	const monoCls      = $derived(size === 'lg'
		? 'w-full border border-border rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y'
		: size === 'md'
		? 'w-full border border-border rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y'
		: 'w-full border border-border-subtle rounded px-2 py-1 text-xs font-mono resize-y');
	const jsonCls      = $derived(size === 'lg'
		? 'w-full border border-border rounded-md px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y'
		: size === 'md'
		? 'w-full border border-border rounded-md px-3 py-2 text-xs font-mono resize-y'
		: 'w-full border border-border-subtle rounded px-2 py-1 text-xs font-mono resize-y');
	const checkboxCls  = $derived(size === 'md' ? 'w-4 h-4' : 'w-4 h-4 text-primary border-border rounded');

	const arrayStringsRows  = $derived(textareaRows ?? (size === 'lg' ? 3 : 2));
	const jsonRows          = $derived(textareaRows ?? (size === 'lg' ? 4 : 2));
	const textareaFieldRows = $derived(textareaRows ?? (size === 'lg' ? 6 : 3));
</script>

{#if field.inputType === 'nested-object'}
	<div class="ml-2 border-l border-border-subtle pl-2">
		<NestedObjectEditor
			{field}
			value={(value as Record<string, unknown> ?? {})}
			onUpdate={(v: Record<string, unknown>) => onUpdate(v)}
		/>
	</div>

{:else if field.inputType === 'array-objects'}
	<div class="ml-2 border-l border-border-subtle pl-2">
		<ArrayObjectEditor
			{field}
			value={(value as Record<string, unknown>[] ?? [])}
			onUpdate={(items: Record<string, unknown>[]) => onUpdate(items)}
		/>
	</div>

{:else if field.inputType === 'array-strings'}
	<textarea
		{id}
		rows={arrayStringsRows}
		value={(value as string[] ?? []).join('\n')}
		oninput={(e) => onUpdate((e.target as HTMLTextAreaElement).value.split('\n').filter((s: string) => s.trim() !== ''))}
		class={monoCls}
		placeholder="Un elemento por línea"
	></textarea>

{:else if field.inputType === 'asset-picker'}
	<AssetPicker
		value={String(value ?? '')}
		onSelect={(url) => onUpdate(url)}
	/>

{:else if field.inputType === 'checkbox'}
	<input
		{id}
		type="checkbox"
		checked={Boolean(value ?? false)}
		onchange={(e) => onUpdate((e.target as HTMLInputElement).checked)}
		class={checkboxCls}
	/>

{:else if field.inputType === 'select'}
	<select
		{id}
		value={String(value ?? field.options?.[0] ?? '')}
		onchange={(e) => onUpdate((e.target as HTMLSelectElement).value)}
		class={inputCls}
	>
		{#each field.options ?? [] as opt (opt)}
			<option value={opt}>{opt}</option>
		{/each}
	</select>

{:else if field.inputType === 'number'}
	<input
		{id}
		type="number"
		value={Number(value ?? 0)}
		oninput={(e) => onUpdate(Number((e.target as HTMLInputElement).value))}
		class={inputCls}
	/>

{:else if field.inputType === 'json'}
	<textarea
		{id}
		rows={jsonRows}
		value={JSON.stringify(value ?? {}, null, 2)}
		oninput={(e) => {
			try { onUpdate(JSON.parse((e.target as HTMLTextAreaElement).value)); } catch { /* esperar JSON válido */ }
		}}
		class={jsonCls}
		placeholder="&#123;&#125;"
	></textarea>

{:else if field.inputType === 'textarea'}
	<textarea
		{id}
		rows={textareaFieldRows}
		oninput={(e) => onUpdate((e.target as HTMLTextAreaElement).value)}
		class={textareaCls}
	>{String(value ?? '')}</textarea>

{:else}
	<input
		{id}
		type="text"
		value={String(value ?? '')}
		oninput={(e) => onUpdate((e.target as HTMLInputElement).value)}
		class={inputCls}
		placeholder={field.key}
	/>
{/if}
