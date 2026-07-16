<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { slugify } from '$lib/metadata';
	import { toast } from '$lib/toast.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { PageData } from './$types';
	import type { ActionResult } from '@sveltejs/kit';

	let { data }: { data: PageData } = $props();

	let newTitle      = $state('');
	let newSlug       = $state('');
	let slugWasEdited = $state(false);

	let deletePendingId    = $state('');
	let deletePendingTitle = $state('');
	let deleteFormEl       = $state<HTMLFormElement | undefined>();

	let confirmOpen    = $state(false);
	let confirmTitle   = $state('');
	let confirmMessage = $state('');
	let confirmLabel   = $state('Confirmar');
	let confirmDanger  = $state(false);
	let confirmAction  = $state<(() => void) | null>(null);

	function openConfirm(opts: {
		title: string; message: string; label?: string; danger?: boolean; onConfirm: () => void;
	}) {
		confirmTitle   = opts.title;
		confirmMessage = opts.message;
		confirmLabel   = opts.label ?? 'Confirmar';
		confirmDanger  = opts.danger ?? false;
		confirmAction  = opts.onConfirm;
		confirmOpen    = true;
	}

	function askDelete(item: { id: string; title: string }) {
		openConfirm({
			title:   'Eliminar ítem',
			message: `¿Eliminar "${item.title}" permanentemente? Esta acción no se puede deshacer.`,
			label:   'Eliminar',
			danger:  true,
			onConfirm: async () => {
				deletePendingId    = item.id;
				deletePendingTitle = item.title;
				await tick();
				deleteFormEl?.requestSubmit();
			},
		});
	}

	function withToast() {
		return async ({ result, update }: { result: ActionResult; update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			if (result.type === 'success' && (result.data as Record<string, unknown>)?.success) {
				toast('success', String((result.data as Record<string, unknown>).success));
			} else if (result.type === 'failure' && (result.data as Record<string, unknown>)?.error) {
				toast('error', String((result.data as Record<string, unknown>).error));
			}
		};
	}

	function handleTitleInput(e: Event) {
		const v = (e.target as HTMLInputElement).value;
		newTitle = v;
		if (!slugWasEdited) newSlug = slugify(v);
	}

	function handleSlugInput() {
		slugWasEdited = newSlug !== slugify(newTitle);
	}
</script>

<svelte:head><title>{data.collection.name} — {data.project.name}</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center gap-2 text-sm text-gray-500">
		<a href="/dashboard" class="hover:text-gray-900">Proyectos</a>
		<span>/</span>
		<a href="/projects/{data.project.id}" class="hover:text-gray-900">{data.project.name}</a>
		<span>/</span>
		<a href="/projects/{data.project.id}/collections" class="hover:text-gray-900">Colecciones</a>
		<span>/</span>
		<span class="text-gray-900 font-medium">{data.collection.name}</span>
	</div>

	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold text-gray-900">{data.collection.name}</h1>
	</div>

	{#if data.items.length === 0}
		<div class="bg-white border border-gray-200 rounded-lg p-10 text-center">
			<p class="text-gray-500 text-sm">No hay ítems en esta colección.</p>
		</div>
	{:else}
		<div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
			<div class="hidden md:grid grid-cols-[48px_1fr_200px_100px_180px] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs font-medium text-gray-500 uppercase tracking-wide">
				<span>#</span>
				<span>Título</span>
				<span>URL</span>
				<span>Estado</span>
				<span>Acciones</span>
			</div>
			<div class="divide-y divide-gray-100">
				{#each data.items as item (item.id)}
					<div class="px-4 py-3 grid md:grid-cols-[48px_1fr_200px_100px_180px] gap-2 md:gap-3 items-center">
						<span class="text-sm text-gray-400">{item.order}</span>
						<span class="text-sm font-medium text-gray-900">{item.title}</span>
						<span class="text-xs font-mono text-gray-500 truncate">{item.full_path}</span>
						<span
							class="text-xs px-2 py-0.5 rounded-full inline-block
								{item.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}"
						>
							{item.status === 'published' ? 'Publicado' : 'Borrador'}
						</span>
						<div class="flex items-center gap-2 flex-shrink-0">
							<form method="POST" action="?/toggleStatus" use:enhance={withToast}>
								<input type="hidden" name="item_id" value={item.id} />
								<input type="hidden" name="item_title" value={item.title} />
								<input type="hidden" name="new_status" value={item.status === 'published' ? 'draft' : 'published'} />
								<button
									type="submit"
									class="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
								>
									{item.status === 'published' ? 'Despublicar' : 'Publicar'}
								</button>
							</form>
							<a
								href="/projects/{data.project.id}/collections/{data.collection.id}/{item.id}"
								class="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
							>
								Editar
							</a>
							<button
								type="button"
								onclick={() => askDelete(item)}
								class="text-xs px-2 py-1 rounded border border-gray-200 text-red-500 hover:border-red-300 hover:text-red-700 transition-colors"
							>
								Eliminar
							</button>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<div class="bg-white border border-gray-200 rounded-lg p-5">
		<h2 class="text-sm font-semibold text-gray-700 mb-4">Nuevo ítem</h2>
		<form
			method="POST"
			action="?/create"
			use:enhance={() => async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') {
					newTitle = ''; newSlug = ''; slugWasEdited = false;
					const msg = (result.data as Record<string, unknown>)?.success;
					if (msg) toast('success', String(msg));
				} else if (result.type === 'failure') {
					const err = (result.data as Record<string, unknown>)?.error;
					if (err) toast('error', String(err));
				}
			}}
			class="flex items-end gap-3 flex-wrap"
		>
			<div class="flex-1 min-w-48">
				<label class="block text-xs text-gray-600 mb-1" for="new-title">Título</label>
				<input
					id="new-title"
					name="title"
					type="text"
					value={newTitle}
					oninput={handleTitleInput}
					required
					placeholder="Nombre del ítem"
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>
			<div class="flex-1 min-w-36">
				<label class="block text-xs text-gray-600 mb-1" for="new-slug">Slug</label>
				<input
					id="new-slug"
					name="slug"
					type="text"
					value={newSlug}
					oninput={(e) => { newSlug = (e.target as HTMLInputElement).value; handleSlugInput(); }}
					required
					placeholder="nombre-del-item"
					pattern="[-a-z0-9]+"
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>
			<button
				type="submit"
				class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
			>
				Crear
			</button>
		</form>
	</div>
</div>

<form
	bind:this={deleteFormEl}
	method="POST"
	action="?/deleteItem"
	use:enhance={withToast}
	class="hidden"
>
	<input type="hidden" name="item_id" value={deletePendingId} />
	<input type="hidden" name="item_title" value={deletePendingTitle} />
</form>

<ConfirmDialog
	bind:open={confirmOpen}
	title={confirmTitle}
	message={confirmMessage}
	confirmLabel={confirmLabel}
	danger={confirmDanger}
	onConfirm={() => confirmAction?.()}
/>
