<script lang="ts">
	import { ADMIN_BLOCK_REGISTRY } from '$lib/blocks/adminRegistry';

	let {
		open     = $bindable(false),
		onSelect,
	}: {
		open:     boolean;
		onSelect: (type: string) => void;
	} = $props();

	// Solo bloques de scope 'page' (por defecto). 'site' y 'embedded' se gestionan aparte.
	const entries = Object.entries(ADMIN_BLOCK_REGISTRY).filter(
		([, e]) => !e.scope || e.scope === 'page',
	);
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Seleccionar tipo de bloque">
		<button
			class="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-default"
			onclick={() => (open = false)}
			aria-label="Cerrar"
		></button>

		<div class="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
			<h2 class="text-base font-semibold text-gray-900 mb-4">Añadir bloque</h2>

			<div class="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
				{#each entries as [type, entry] (type)}
					<button
						onclick={() => { onSelect(type); open = false; }}
						class="text-left px-3 py-2.5 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 text-sm text-gray-700 transition-colors"
					>
						{entry.label}
					</button>
				{/each}
			</div>

			<button
				onclick={() => (open = false)}
				class="mt-4 text-xs text-gray-400 hover:text-gray-700 transition-colors"
			>
				Cancelar
			</button>
		</div>
	</div>
{/if}
