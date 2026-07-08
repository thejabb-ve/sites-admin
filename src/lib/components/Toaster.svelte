<script lang="ts">
	import { toasts, dismiss } from '$lib/toast.svelte';

	const icons = {
		success: `<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414L8.414 15l-4.121-4.121a1 1 0 011.414-1.414L8.414 12.172l6.879-6.879a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>`,
		error:   `<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>`,
		info:    `<svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>`,
	};

	const styles = {
		success: 'bg-white border-green-500 text-green-800',
		error:   'bg-white border-red-500   text-red-800',
		info:    'bg-white border-blue-500  text-blue-800',
	};

	const iconStyles = {
		success: 'text-green-500',
		error:   'text-red-500',
		info:    'text-blue-500',
	};
</script>

<div class="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite">
	{#each toasts.list as t (t.id)}
		<div
			class="pointer-events-auto flex items-start gap-3 min-w-72 max-w-sm px-4 py-3 rounded-lg border-l-4 shadow-lg {styles[t.type]} animate-in"
		>
			<span class="flex-shrink-0 mt-0.5 {iconStyles[t.type]}">
				{@html icons[t.type]}
			</span>
			<p class="flex-1 text-sm font-medium leading-snug">{t.message}</p>
			<button
				onclick={() => dismiss(t.id)}
				class="flex-shrink-0 -mt-0.5 -mr-1 p-1 rounded opacity-50 hover:opacity-100 transition-opacity"
				aria-label="Cerrar"
			>
				<svg class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
					<path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
				</svg>
			</button>
		</div>
	{/each}
</div>

<style>
	.animate-in {
		animation: slide-in 0.2s ease-out;
	}
	@keyframes slide-in {
		from { opacity: 0; transform: translateX(1rem); }
		to   { opacity: 1; transform: translateX(0); }
	}
</style>
