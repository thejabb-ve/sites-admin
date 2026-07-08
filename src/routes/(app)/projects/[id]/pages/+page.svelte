<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { slugify } from '$lib/metadata';
	import { toast } from '$lib/toast.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { PageData, ActionData } from './$types';
	import type { ActionResult } from '@sveltejs/kit';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let newTitle      = $state('');
	let newSlug       = $state('');
	let slugWasEdited = $state(false);

	// Forms compartidos para acciones que requieren confirmación
	let archivePendingId = $state('');
	let deletePendingId  = $state('');
	let archiveFormEl    = $state<HTMLFormElement | undefined>();
	let deleteFormEl     = $state<HTMLFormElement | undefined>();

	// Diálogo de confirmación
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

	function askArchive(page: { id: string; title: string }) {
		openConfirm({
			title:   'Archivar página',
			message: `¿Archivar "${page.title}"? Podrás restaurarla desde el tab de Archivadas.`,
			label:   'Archivar',
			danger:  true,
			onConfirm: async () => {
				archivePendingId = page.id;
				await tick();
				archiveFormEl?.requestSubmit();
			},
		});
	}

	function askDelete(page: { id: string; title: string }) {
		openConfirm({
			title:   'Eliminar página',
			message: `¿Eliminar "${page.title}" permanentemente? Esta acción no se puede deshacer.`,
			label:   'Eliminar',
			danger:  true,
			onConfirm: async () => {
				deletePendingId = page.id;
				await tick();
				deleteFormEl?.requestSubmit();
			},
		});
	}

	// Callback reutilizable: actualiza el DOM y muestra toast
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

<svelte:head><title>Páginas — {data.project.name}</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center gap-2 text-sm text-gray-500">
		<a href="/dashboard" class="hover:text-gray-900">Proyectos</a>
		<span>/</span>
		<a href="/projects/{data.project.id}" class="hover:text-gray-900">{data.project.name}</a>
		<span>/</span>
		<span class="text-gray-900 font-medium">Páginas</span>
	</div>

	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold text-gray-900">Páginas</h1>
	</div>

	<!-- Tabs: Activas / Archivadas -->
	<div class="flex gap-1 border-b border-gray-200">
		<a
			href="?tab=active"
			class="px-4 py-2 text-sm font-medium transition-colors rounded-t-md
				{data.tab === 'active'
					? 'border-b-2 border-blue-600 text-blue-600 -mb-px'
					: 'text-gray-500 hover:text-gray-900'}"
		>
			Activas
		</a>
		<a
			href="?tab=archived"
			class="px-4 py-2 text-sm font-medium transition-colors rounded-t-md
				{data.tab === 'archived'
					? 'border-b-2 border-blue-600 text-blue-600 -mb-px'
					: 'text-gray-500 hover:text-gray-900'}"
		>
			Archivadas
		</a>
	</div>

	<!-- Listado de páginas -->
	{#if data.pages.length === 0}
		<div class="bg-white border border-gray-200 rounded-lg p-10 text-center">
			<p class="text-gray-500 text-sm">
				{data.tab === 'archived' ? 'No hay páginas archivadas.' : 'No hay páginas. Crea la primera abajo.'}
			</p>
		</div>
	{:else}
		<div class="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
			{#each data.pages as page (page.id)}
				<div class="px-4 py-3 flex items-center gap-3">
					<div class="flex-1 min-w-0">
						<div class="flex items-center gap-2">
							<a
								href="/projects/{data.project.id}/pages/{page.id}/metadata"
								class="text-sm font-medium text-gray-900 hover:text-blue-600 truncate"
							>
								{page.title}
							</a>
							{#if data.tab === 'active'}
								<span
									class="text-xs px-2 py-0.5 rounded-full flex-shrink-0
										{page.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}"
								>
									{page.status === 'published' ? 'Publicada' : 'Borrador'}
								</span>
							{/if}
						</div>
						<p class="text-xs text-gray-400 font-mono mt-0.5">{page.full_path}</p>
					</div>

					<div class="flex items-center gap-2 flex-shrink-0">
						{#if data.tab === 'active'}
							<!-- Publicar / Despublicar -->
							<form method="POST" action="?/togglePublish" use:enhance={withToast}>
								<input type="hidden" name="page_id" value={page.id} />
								<input type="hidden" name="new_status" value={page.status === 'published' ? 'draft' : 'published'} />
								<button
									type="submit"
									class="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
								>
									{page.status === 'published' ? 'Despublicar' : 'Publicar'}
								</button>
							</form>

							<!-- SEO -->
							<a
								href="/projects/{data.project.id}/pages/{page.id}/metadata"
								class="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:border-gray-400 hover:text-gray-900 transition-colors"
							>
								SEO
							</a>

							<!-- Archivar -->
							<button
								type="button"
								onclick={() => askArchive(page)}
								class="text-xs px-2 py-1 rounded border border-gray-200 text-red-500 hover:border-red-300 hover:text-red-700 transition-colors"
							>
								Archivar
							</button>
						{:else}
							<!-- Restaurar (tab archivadas) -->
							<form method="POST" action="?/restore" use:enhance={withToast}>
								<input type="hidden" name="page_id" value={page.id} />
								<button
									type="submit"
									class="text-xs px-2 py-1 rounded border border-gray-200 text-blue-600 hover:border-blue-400 hover:text-blue-800 transition-colors"
								>
									Restaurar
								</button>
							</form>

							<!-- Eliminar permanentemente -->
							<button
								type="button"
								onclick={() => askDelete(page)}
								class="text-xs px-2 py-1 rounded border border-gray-200 text-red-500 hover:border-red-300 hover:text-red-700 transition-colors"
							>
								Eliminar
							</button>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- Formulario para crear página (solo en tab activas) -->
	{#if data.tab === 'active'}
		<div class="bg-white border border-gray-200 rounded-lg p-5">
			<h2 class="text-sm font-semibold text-gray-700 mb-4">Nueva página</h2>
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
						placeholder="Servicios"
						class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>
				<div class="flex-1 min-w-36">
					<label class="block text-xs text-gray-600 mb-1" for="new-slug">
						Slug <span class="text-gray-400 font-mono">/slug</span>
					</label>
					<input
						id="new-slug"
						name="slug"
						type="text"
						value={newSlug}
						oninput={(e) => { newSlug = (e.target as HTMLInputElement).value; handleSlugInput(); }}
						required
						placeholder="servicios"
						pattern="[a-z0-9-]+"
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
	{/if}
</div>

<!-- Forms ocultos para acciones que requieren confirmación -->
<form
	bind:this={archiveFormEl}
	method="POST"
	action="?/archive"
	use:enhance={withToast}
	class="hidden"
>
	<input type="hidden" name="page_id" value={archivePendingId} />
</form>

<form
	bind:this={deleteFormEl}
	method="POST"
	action="?/deletePage"
	use:enhance={withToast}
	class="hidden"
>
	<input type="hidden" name="page_id" value={deletePendingId} />
</form>

<ConfirmDialog
	bind:open={confirmOpen}
	title={confirmTitle}
	message={confirmMessage}
	confirmLabel={confirmLabel}
	danger={confirmDanger}
	onConfirm={() => confirmAction?.()}
/>
