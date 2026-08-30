<script lang="ts">
	import type { Asset } from '$lib/types';

	interface Props {
		assets: Asset[];
		onCopyUrl: (asset: Asset) => void;
		onDelete: (asset: Asset) => void;
	}

	let { assets, onCopyUrl, onDelete }: Props = $props();
</script>

{#if assets.length === 0}
	<div class="text-center py-16 text-faint">
		<svg class="w-12 h-12 mx-auto mb-3 text-border-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/>
		</svg>
		<p class="text-sm">Sube imágenes o vídeos para este proyecto</p>
	</div>
{:else}
	<div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
		{#each assets as asset (asset.id)}
			<div class="group relative rounded-lg overflow-hidden aspect-square
				{asset.mime_type.startsWith('video/') ? 'bg-ink' : 'bg-surface-muted-strong'}">

				{#if asset.mime_type.startsWith('video/')}
					<!-- Tarjeta de vídeo -->
					<div class="w-full h-full flex flex-col items-center justify-center gap-1.5">
						<svg class="w-8 h-8 text-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
							<path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"/>
						</svg>
						<span class="text-[10px] text-subtle px-2 text-center truncate w-full leading-tight">
							{asset.filename}
						</span>
					</div>
				{:else}
					<!-- Tarjeta de imagen -->
					<img
						src={asset.thumb_url ?? asset.url}
						alt={asset.filename}
						class="w-full h-full object-cover"
						loading="lazy"
						referrerpolicy="no-referrer"
					/>
					<!-- Badge procesando -->
					{#if !asset.thumb_url}
						<div class="absolute top-1.5 left-1.5">
							<span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-warning rounded-full">
								<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
								Procesando
							</span>
						</div>
					{/if}
				{/if}

				<!-- Overlay en hover -->
				<div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end gap-1 p-1.5">
					<div class="flex gap-1">
						<button
							type="button"
							onclick={() => onCopyUrl(asset)}
							title="Copiar URL"
							class="flex-1 py-0.5 text-[9px] font-medium bg-white/20 hover:bg-white/30 text-white rounded transition-colors"
						>
							URL
						</button>
						<button
							type="button"
							onclick={() => onDelete(asset)}
							title="Eliminar"
							class="py-0.5 px-1.5 text-[9px] font-medium bg-danger/80 hover:bg-danger text-white rounded transition-colors"
						>
							✕
						</button>
					</div>
				</div>
			</div>
		{/each}
	</div>
{/if}
