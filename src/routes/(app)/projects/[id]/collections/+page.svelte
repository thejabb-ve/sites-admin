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
	<div class="flex items-center gap-2 text-sm text-gray-500">
		<a href="/dashboard" class="hover:text-gray-900">Proyectos</a>
		<span>/</span>
		<a href="/projects/{data.project.id}" class="hover:text-gray-900">{data.project.name}</a>
		<span>/</span>
		<span class="text-gray-900 font-medium">Colecciones</span>
	</div>

	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold text-gray-900">Colecciones</h1>
	</div>

	{#if collections.length === 0}
		<div class="bg-white border border-gray-200 rounded-lg p-10 text-center">
			<p class="text-gray-500 text-sm">
				Este proyecto no tiene colecciones. Agrégalas con <code class="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">bun run seed:content</code>.
			</p>
		</div>
	{:else}
		<div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
			<div class="hidden md:grid grid-cols-[1fr_200px_80px_120px] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
				<span>Nombre</span>
				<span>Slug</span>
				<span>Ítems</span>
				<span>Acción</span>
			</div>
			<div class="divide-y divide-gray-100">
				{#each collections as collection (collection.id)}
					<div class="px-4 py-3 grid md:grid-cols-[1fr_200px_80px_120px] gap-2 md:gap-3 items-center">
						<span class="text-sm font-medium text-gray-900">{collection.name}</span>
						<span class="text-xs font-mono text-gray-500">{collection.slug}</span>
						<span class="text-sm text-gray-600">{collection.collection_items[0].count}</span>
						<a
							href="/projects/{data.project.id}/collections/{collection.id}"
							class="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors inline-block"
						>
							Gestionar →
						</a>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
