<script lang="ts">
	import { tick }    from 'svelte';
	import { enhance } from '$app/forms';
	import { toast }   from '$lib/toast.svelte';
	import BlockList         from '$lib/components/BlockList.svelte';
	import BlockTypeSelector from '$lib/components/BlockTypeSelector.svelte';
	import type { PageData } from './$types';
	import type { ActionResult }         from '@sveltejs/kit';

	let { data }: { data: PageData } = $props();

	type Block = {
		id:               string;
		type:             string;
		order:            number;
		props:            Record<string, unknown>;
		version:          number;
		parent_block_id?: string | null;
	};

	let selectorOpen  = $state(false);
	let selectedType  = $state('');
	let addFormEl     = $state<HTMLFormElement | undefined>();
	let adding        = $state(false);

	async function handleSelectType(type: string) {
		selectedType = type;
		await tick();
		addFormEl?.requestSubmit();
	}
</script>

<svelte:head><title>Bloques — {data.page.title} — {data.project.name}</title></svelte:head>

<div class="space-y-6">
	<!-- Breadcrumb -->
	<div class="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
		<a href="/dashboard" class="hover:text-gray-900">Proyectos</a>
		<span>/</span>
		<a href="/projects/{data.project.id}" class="hover:text-gray-900">{data.project.name}</a>
		<span>/</span>
		<a href="/projects/{data.project.id}/pages" class="hover:text-gray-900">Páginas</a>
		<span>/</span>
		<span class="text-gray-900 font-medium">{data.page.title}</span>
	</div>

	<!-- Sub-nav: Bloques | SEO -->
	<div class="flex gap-1 border-b border-gray-200">
		<a
			href="/projects/{data.project.id}/pages/{data.page.id}/blocks"
			class="px-4 py-2 text-sm font-medium border-b-2 border-blue-600 text-blue-600 -mb-px"
		>
			Bloques
		</a>
		<a
			href="/projects/{data.project.id}/pages/{data.page.id}/metadata"
			class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
		>
			SEO
		</a>
	</div>

	<!-- Encabezado -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold text-gray-900">Bloques</h1>
			<p class="text-sm text-gray-500 font-mono mt-0.5">{data.page.full_path}</p>
		</div>
		<button
			type="button"
			disabled={adding}
			onclick={() => (selectorOpen = true)}
			class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
		>
			{adding ? 'Añadiendo…' : '+ Añadir bloque'}
		</button>
	</div>

	<!-- Lista de bloques -->
	<BlockList serverBlocks={data.blocks as Block[]} />
</div>

<!-- Selector de tipo de bloque -->
<BlockTypeSelector bind:open={selectorOpen} onSelect={handleSelectType} />

<!-- Form oculto: añadir bloque -->
<form
	bind:this={addFormEl}
	method="POST"
	action="?/addBlock"
	use:enhance={() => {
		adding = true;
		return async ({ result, update }: { result: ActionResult; update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			adding = false;
			if (result.type === 'success') {
				toast('success', 'Bloque añadido.');
			} else if (result.type === 'failure') {
				toast('error', (result.data as Record<string, string>)?.error ?? 'Error al añadir el bloque.');
			}
		};
	}}
	class="hidden"
>
	<input type="hidden" name="type" value={selectedType} />
</form>
