<script lang="ts">
	import { page } from '$app/state';
	import type { Asset } from '$lib/types';

	let {
		value,
		onSelect,
	}: {
		value:    string;
		onSelect: (url: string) => void;
	} = $props();

	let open    = $state(false);
	let loading = $state(false);
	let assets  = $state<Asset[]>([]);

	const projectId = $derived(page.params.id);

	async function openPicker() {
		open = true;
		await loadAssets();
	}

	async function loadAssets() {
		loading = true;
		try {
			const res = await fetch(`/api/projects/${projectId}/assets`);
			assets = (await res.json()) as Asset[];
		} finally {
			loading = false;
		}
	}

	function select(asset: Asset) {
		onSelect(asset.url);
		open = false;
	}

	function imgSrc(a: Asset): string {
		return a.thumb_url ?? a.url;
	}
</script>

<div class="flex items-start gap-2">
	{#if value}
		<img
			src={value}
			alt=""
			class="h-10 w-10 object-cover rounded border border-border-subtle flex-shrink-0" referrerpolicy="no-referrer"
		/>
	{/if}

	<div class="flex-1 min-w-0">
		<input
			type="text"
			readonly
			{value}
			placeholder="Sin imagen seleccionada"
			class="w-full border border-border rounded-md px-3 py-2 text-xs font-mono text-subtle bg-surface-muted truncate"
		/>
	</div>

	<button
		type="button"
		onclick={openPicker}
		class="flex-shrink-0 px-2 py-2 text-xs border border-border rounded-md text-muted hover:border-faint hover:text-ink transition-colors whitespace-nowrap"
	>
		{value ? 'Cambiar' : 'Seleccionar'}
	</button>
</div>

{#if open}
	<!-- Overlay -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4"
		role="presentation"
	>
		<!-- Fondo oscuro -->
		<div
			class="absolute inset-0 bg-black/40"
			role="button"
			tabindex="-1"
			aria-label="Cerrar"
			onclick={() => (open = false)}
			onkeydown={(e) => e.key === 'Escape' && (open = false)}
		></div>

		<!-- Panel -->
		<div class="relative z-10 w-full max-w-2xl bg-white rounded-xl shadow-xl flex flex-col max-h-[80vh]">
			<div class="flex items-center justify-between px-4 py-3 border-b border-border-subtle flex-shrink-0">
				<h2 class="text-sm font-semibold text-ink">Seleccionar imagen</h2>
				<button
					type="button"
					onclick={() => (open = false)}
					class="text-faint hover:text-body text-lg leading-none"
					aria-label="Cerrar"
				>✕</button>
			</div>

			<div class="p-4 overflow-y-auto flex-1">
				{#if loading}
					<p class="text-sm text-faint text-center py-8">Cargando imágenes…</p>
				{:else if assets.length === 0}
					<p class="text-sm text-faint text-center py-8">
						Este proyecto no tiene imágenes cargadas todavía.
					</p>
				{:else}
					<div class="grid grid-cols-3 sm:grid-cols-4 gap-3">
						{#each assets as asset (asset.id)}
							<button
								type="button"
								onclick={() => select(asset)}
								class="group relative aspect-square rounded border-2 overflow-hidden transition-colors
									{value === asset.url
										? 'border-blue-500'
										: 'border-border-subtle hover:border-blue-300'}"
								title={asset.filename}
							>
								<img
									src={imgSrc(asset)}
									alt={asset.filename}
									loading="lazy"
									class="w-full h-full object-cover" referrerpolicy="no-referrer"
								/>
								<div class="absolute inset-x-0 bottom-0 bg-black/50 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
									<p class="text-white text-[10px] truncate">{asset.filename}</p>
								</div>
								{#if value === asset.url}
									<div class="absolute top-1 right-1 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
										<span class="text-white text-[9px] font-bold">✓</span>
									</div>
								{/if}
							</button>
						{/each}
					</div>
				{/if}
			</div>

			<div class="px-4 py-3 border-t border-border-subtle flex justify-end flex-shrink-0">
				<button
					type="button"
					onclick={() => (open = false)}
					class="text-sm text-subtle hover:text-ink transition-colors"
				>
					Cancelar
				</button>
			</div>
		</div>
	</div>
{/if}
