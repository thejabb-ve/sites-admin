<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type CollectionWithCount = {
		id: string;
		name: string;
		slug: string;
		schema: unknown;
		collection_items: [{ count: number }];
	};

	const collections = $derived(data.collections as CollectionWithCount[]);
</script>

<svelte:head><title>Colecciones — {data.project.name}</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center gap-2 text-sm text-subtle">
		<a href="/dashboard" class="hover:text-ink">Proyectos</a>
		<span>/</span>
		<a href="/projects/{data.project.id}" class="hover:text-ink">{data.project.name}</a>
		<span>/</span>
		<span class="text-ink font-medium">Colecciones</span>
	</div>

	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold text-ink">Colecciones</h1>
	</div>

	{#if collections.length === 0}
		<div class="bg-white border border-border-subtle rounded-lg p-10 text-center">
			<p class="text-subtle text-sm">
				Este proyecto no tiene colecciones. Agrégalas con <code class="font-mono text-xs bg-surface-muted-strong px-1 py-0.5 rounded">bun run seed:content</code>.
			</p>
		</div>
	{:else}
		<div class="bg-white border border-border-subtle rounded-lg overflow-hidden">
			<div class="hidden md:grid grid-cols-[1fr_200px_80px_120px] gap-3 px-4 py-2 bg-surface-muted border-b border-border-faint text-xs font-medium text-subtle uppercase tracking-wide">
				<span>Nombre</span>
				<span>Slug</span>
				<span>Ítems</span>
				<span>Acción</span>
			</div>
			<div class="divide-y divide-border-faint">
				{#each collections as collection (collection.id)}
					<div class="px-4 py-3 grid md:grid-cols-[1fr_200px_80px_120px] gap-2 md:gap-3 items-center">
						<span class="text-sm font-medium text-ink">{collection.name}</span>
						<span class="text-xs font-mono text-subtle">{collection.slug}</span>
						<span class="text-sm text-muted">{collection.collection_items[0].count}</span>
						<a
							href="/projects/{data.project.id}/collections/{collection.id}"
							class="text-xs px-2 py-1 rounded border border-border-subtle text-muted hover:border-faint hover:text-ink transition-colors inline-block"
						>
							Gestionar →
						</a>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
