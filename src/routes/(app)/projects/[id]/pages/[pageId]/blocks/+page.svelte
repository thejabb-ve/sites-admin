<script lang="ts">
	import { tick }    from 'svelte';
	import { enhance } from '$app/forms';
	import { toast }   from '$lib/toast.svelte';
	import BlockList         from '$lib/components/BlockList.svelte';
	import BlockTypeSelector from '$lib/components/BlockTypeSelector.svelte';
	import Button            from '$lib/components/Button.svelte';
	import type { PageData } from './$types';
	import type { ActionResult }         from '@sveltejs/kit';
	import type { Block } from '$lib/types';

	let { data }: { data: PageData } = $props();

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
	<div class="flex items-center gap-2 text-sm text-subtle flex-wrap">
		<a href="/dashboard" class="hover:text-ink">Proyectos</a>
		<span>/</span>
		<a href="/projects/{data.project.id}" class="hover:text-ink">{data.project.name}</a>
		<span>/</span>
		<a href="/projects/{data.project.id}/pages" class="hover:text-ink">Páginas</a>
		<span>/</span>
		<span class="text-ink font-medium">{data.page.title}</span>
	</div>

	<!-- Sub-nav: Bloques | SEO -->
	<div class="flex gap-1 border-b border-border-subtle">
		<a
			href="/projects/{data.project.id}/pages/{data.page.id}/blocks"
			class="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary -mb-px"
		>
			Bloques
		</a>
		<a
			href="/projects/{data.project.id}/pages/{data.page.id}/metadata"
			class="px-4 py-2 text-sm font-medium text-subtle hover:text-ink transition-colors"
		>
			SEO
		</a>
	</div>

	<!-- Encabezado -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold text-ink">Bloques</h1>
			<p class="text-sm text-subtle font-mono mt-0.5">{data.page.full_path}</p>
		</div>
		<Button onclick={() => (selectorOpen = true)} loading={adding} loadingLabel="Añadiendo…">
			+ Añadir bloque
		</Button>
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
