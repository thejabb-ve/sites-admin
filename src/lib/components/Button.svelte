<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?:      'primary' | 'secondary' | 'danger' | 'dark' | 'warning' | 'success' | 'ghost';
		loading?:      boolean;
		loadingLabel?: string;
		children:      Snippet;
	}

	let {
		variant      = 'primary',
		loading      = false,
		loadingLabel = 'Guardando…',
		disabled,
		type         = 'button',
		class:  extraClass = '',
		children,
		...rest
	}: Props = $props();

	const variantCls: Record<NonNullable<Props['variant']>, string> = {
		primary:   'bg-blue-600 text-white hover:bg-blue-700',
		secondary: 'bg-white border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50',
		danger:    'bg-red-600 text-white hover:bg-red-700',
		dark:      'bg-dark text-white hover:bg-dark-hover',
		warning:   'bg-warning text-white hover:bg-warning-hover',
		success:   'bg-success text-white hover:bg-success-hover',
		ghost:     'text-faint hover:text-danger',
	};
</script>

<button
	{type}
	disabled={disabled || loading}
	class="px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-60 {variantCls[variant]} {extraClass}"
	{...rest}
>
	{#if loading}{loadingLabel}{:else}{@render children()}{/if}
</button>
