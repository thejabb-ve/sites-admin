<script lang="ts">
	import Button from './Button.svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?:      'primary' | 'secondary' | 'danger' | 'dark' | 'warning' | 'success' | 'ghost';
		loading?:      boolean;
		loadingLabel?: string;
		label?:        string;
	}

	let { label = 'Ok', ...rest }: Props = $props();
</script>

<Button {...rest}>{label}</Button>
