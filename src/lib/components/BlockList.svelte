<script lang="ts">
	import { tick, untrack } from 'svelte';
	import { enhance }       from '$app/forms';
	import { toast }   from '$lib/toast.svelte';
	import { ADMIN_BLOCK_REGISTRY } from '$lib/blocks/adminRegistry';
	import BlockPropsPanel from './BlockPropsPanel.svelte';
	import type { ActionResult } from '@sveltejs/kit';
	import type { Block } from '$lib/types';

	let { serverBlocks }: { serverBlocks: Block[] } = $props();

	// JSON.parse/JSON.stringify para evitar el error de structuredClone con Proxies de Svelte 5
	let blocks = $state<Block[]>(untrack(() => JSON.parse(JSON.stringify(serverBlocks)) as Block[]));
	let editingId    = $state<string | null>(null);
	let dragIndex    = $state<number | null>(null);
	let dragOverIdx  = $state<number | null>(null);

	let parentBlocks = $derived(blocks.filter(b => !b.parent_block_id));

	function childrenOf(parentId: string): Block[] {
		return blocks.filter(b => b.parent_block_id === parentId);
	}

	let deletePendingId  = $state('');
	let deleteFormEl     = $state<HTMLFormElement | undefined>();
	let reorderFormEl    = $state<HTMLFormElement | undefined>();
	let reorderIdsInput  = $state<HTMLInputElement | undefined>();

	// IDs borrados de forma optimista, aún no confirmados por el round-trip de
	// invalidateAll(). Sin excluirlos de la comparación de abajo, el resync
	// revierte el borrado local hasta que `serverBlocks` se actualice.
	let locallyDeletedIds = new Set<string>();

	// Resync when a block is added/removed server-side (different set of IDs)
	$effect(() => {
		const serverIds = new Set(serverBlocks.map(b => b.id));
		const relevantServerIds = new Set([...serverIds].filter(id => !locallyDeletedIds.has(id)));
		const localIds = new Set(blocks.map(b => b.id));
		const same = relevantServerIds.size === localIds.size && [...relevantServerIds].every(id => localIds.has(id));
		if (!same) {
			// Filtrar locallyDeletedIds aquí también: un resync no relacionado (ej. otro bloque
			// añadido desde otra pestaña) mientras un borrado sigue en vuelo no debe hacer
			// reaparecer el bloque que el usuario acaba de borrar.
			blocks = (JSON.parse(JSON.stringify(serverBlocks)) as Block[])
				.filter(b => !locallyDeletedIds.has(b.id));
		}
		for (const id of [...locallyDeletedIds]) {
			if (!serverIds.has(id)) locallyDeletedIds.delete(id);
		}
	});

	// Actualizar input de reordenación usando solo bloques padre
	function getParentIds(): string[] {
		return parentBlocks.map(b => b.id);
	}

	function getLabel(type: string): string {
		return ADMIN_BLOCK_REGISTRY[type]?.label ?? type;
	}

	// ── Drag & drop ──────────────────────────────────────────────────────────

	function handleDragStart(i: number) {
		dragIndex = i;
	}

	function handleDragOver(e: DragEvent, i: number) {
		e.preventDefault();
		dragOverIdx = i;
	}

	function handleDragLeave() {
		dragOverIdx = null;
	}

	async function handleDrop(targetIdx: number) {
		if (dragIndex === null || dragIndex === targetIdx) {
			dragIndex   = null;
			dragOverIdx = null;
			return;
		}

		const updatedParents = [...parentBlocks];
		const [moved] = updatedParents.splice(dragIndex, 1);
		updatedParents.splice(targetIdx, 0, moved!);

		const children = blocks.filter(b => b.parent_block_id);
		blocks = [...updatedParents, ...children];

		dragIndex   = null;
		dragOverIdx = null;

		if (reorderIdsInput) {
			reorderIdsInput.value = JSON.stringify(getParentIds());
		}
		await tick();
		reorderFormEl?.requestSubmit();
	}

	function handleDragEnd() {
		dragIndex   = null;
		dragOverIdx = null;
	}
</script>

<div class="space-y-2" role="list">
	{#each parentBlocks as block, i (block.id)}
		<div
			role="listitem"
			draggable="true"
			ondragstart={() => handleDragStart(i)}
			ondragover={(e) => handleDragOver(e, i)}
			ondragleave={handleDragLeave}
			ondrop={() => handleDrop(i)}
			ondragend={handleDragEnd}
			class="bg-white border rounded-lg transition-colors
				{dragOverIdx === i && dragIndex !== i
					? 'border-blue-400 ring-1 ring-blue-400'
					: 'border-border-subtle'}"
		>
			<!-- Fila del bloque -->
			<div class="px-4 py-3 flex items-center gap-3">
				<span
					class="text-faint cursor-grab select-none text-lg leading-none"
					aria-hidden="true"
				>⠿</span>

				<span class="flex-1 text-sm font-medium text-gray-800 truncate">
					{getLabel(block.type)}
				</span>

				<div class="flex items-center gap-2 flex-shrink-0">
					<button
						type="button"
						onclick={() => (editingId = editingId === block.id ? null : block.id)}
						class="text-xs px-2 py-1 rounded border border-border-subtle text-muted hover:border-faint hover:text-ink transition-colors"
					>
						{editingId === block.id ? 'Cerrar' : 'Editar'}
					</button>

					<button
						type="button"
						aria-label="Eliminar bloque"
						onclick={async () => {
							deletePendingId = block.id;
							await tick();
							deleteFormEl?.requestSubmit();
						}}
						class="text-xs px-2 py-1 rounded border border-border-subtle text-danger hover:border-red-300 hover:text-danger-hover transition-colors"
					>
						✕
					</button>
				</div>
			</div>

			<!-- Panel de props inline -->
			{#if editingId === block.id}
				<BlockPropsPanel
					blockId={block.id}
					blockType={block.type}
					initialProps={block.props}
					onClose={() => (editingId = null)}
					onSaved={(updatedProps) => {
						blocks = blocks.map(b => b.id === block.id ? { ...b, props: updatedProps } : b);
						editingId = null;
					}}
				/>
			{/if}

			<!-- Bloques hijo (embebidos) -->
			{#each childrenOf(block.id) as child (child.id)}
				<div class="ml-8 border-l-2 border-blue-100 pl-2 pb-2">
					<div class="bg-white border border-blue-100 rounded-lg">
						<div class="px-4 py-2 flex items-center gap-3">
							<span class="text-xs text-blue-400">↳</span>
							<span class="flex-1 text-sm text-body truncate">{getLabel(child.type)}</span>
							<button
								type="button"
								onclick={() => (editingId = editingId === child.id ? null : child.id)}
								class="text-xs px-2 py-1 rounded border border-border-subtle text-muted hover:border-faint"
							>
								{editingId === child.id ? 'Cerrar' : 'Editar'}
							</button>
						</div>
						{#if editingId === child.id}
							<BlockPropsPanel
								blockId={child.id}
								blockType={child.type}
								initialProps={child.props}
								onClose={() => (editingId = null)}
								onSaved={(updatedProps) => {
									blocks = blocks.map(b => b.id === child.id ? { ...b, props: updatedProps } : b);
									editingId = null;
								}}
							/>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/each}

	{#if parentBlocks.length === 0}
		<div class="bg-white border border-dashed border-border rounded-lg p-10 text-center">
			<p class="text-sm text-faint">Esta página no tiene bloques. Añade el primero.</p>
		</div>
	{/if}
</div>

<!-- Form oculto: reordenar -->
<form
	bind:this={reorderFormEl}
	method="POST"
	action="?/reorderBlocks"
	use:enhance={() => async ({ result, update }: { result: ActionResult; update: (opts?: { reset?: boolean }) => Promise<void> }) => {
		await update({ reset: false });
		if (result.type === 'failure') {
			toast('error', (result.data as Record<string, string>)?.error ?? 'Error al reordenar.');
		}
	}}
	class="hidden"
>
	<input bind:this={reorderIdsInput} type="hidden" name="ordered_ids" value="" />
</form>

<!-- Form oculto: eliminar -->
<form
	bind:this={deleteFormEl}
	method="POST"
	action="?/deleteBlock"
	use:enhance={() => async ({ result, update }: { result: ActionResult; update: (opts?: { reset?: boolean }) => Promise<void> }) => {
		await update({ reset: false });
		if (result.type === 'success') {
			toast('success', 'Bloque eliminado.');
			locallyDeletedIds.add(deletePendingId);
			blocks = blocks.filter(b => b.id !== deletePendingId);
		} else if (result.type === 'failure') {
			toast('error', (result.data as Record<string, string>)?.error ?? 'Error al eliminar.');
		}
	}}
	class="hidden"
>
	<input type="hidden" name="block_id" value={deletePendingId} />
</form>
