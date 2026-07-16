<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from '$lib/toast.svelte';
	import type { PageData } from './$types';
	import type { ActionResult } from '@sveltejs/kit';

	let { data }: { data: PageData } = $props();

	const schema = $derived(data.collection.schema as {
		base_path?: string;
		fields: Array<{ key: string; type: string; label: string; options?: string[] }>;
		card: unknown;
		detail: unknown;
	});

	const fields = $derived(data.item.fields as Record<string, unknown>);

	function fieldValue(key: string): string {
		const v = fields[key];
		if (Array.isArray(v)) return v.join('\n');
		return String(v ?? '');
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
</script>

<svelte:head><title>{data.item.title} — {data.collection.name}</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center gap-2 text-sm text-gray-500">
		<a href="/dashboard" class="hover:text-gray-900">Proyectos</a>
		<span>/</span>
		<a href="/projects/{data.project.id}" class="hover:text-gray-900">{data.project.name}</a>
		<span>/</span>
		<a href="/projects/{data.project.id}/collections" class="hover:text-gray-900">Colecciones</a>
		<span>/</span>
		<a href="/projects/{data.project.id}/collections/{data.collection.id}" class="hover:text-gray-900">{data.collection.name}</a>
		<span>/</span>
		<span class="text-gray-900 font-medium">{data.item.title}</span>
	</div>

	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold text-gray-900">Editar ítem</h1>
		<a
			href="/projects/{data.project.id}/collections/{data.collection.id}"
			class="px-3 py-1.5 text-sm border border-gray-200 rounded-md text-gray-700 hover:border-gray-400 hover:text-gray-900 transition-colors"
		>
			← Volver
		</a>
	</div>

	<form method="POST" action="?/update" use:enhance={withToast} class="space-y-6">
		<div class="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
			<h2 class="text-sm font-semibold text-gray-700">Campos base</h2>

			<div>
				<label class="block text-xs text-gray-600 mb-1" for="field-title">Título</label>
				<input
					id="field-title"
					name="title"
					type="text"
					value={data.item.title}
					required
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>

			<div>
				<label class="block text-xs text-gray-600 mb-1" for="field-slug">Slug</label>
				<input
					id="field-slug"
					name="slug"
					type="text"
					value={data.item.slug}
					required
					pattern="[-a-z0-9]+"
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>

			<div>
				<label class="block text-xs text-gray-600 mb-1" for="field-full-path">URL completa</label>
				<input
					id="field-full-path"
					name="full_path"
					type="text"
					value={data.item.full_path}
					required
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="block text-xs text-gray-600 mb-1" for="field-order">Orden</label>
					<input
						id="field-order"
						name="order"
						type="number"
						value={data.item.order}
						min="1"
						required
						class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>
				<div>
					<label class="block text-xs text-gray-600 mb-1" for="field-status">Estado</label>
					<select
						id="field-status"
						name="status"
						class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value="draft" selected={data.item.status === 'draft'}>Borrador</option>
						<option value="published" selected={data.item.status === 'published'}>Publicado</option>
					</select>
				</div>
			</div>
		</div>

		{#if schema.fields.length > 0}
			<div class="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
				<h2 class="text-sm font-semibold text-gray-700">Campos de la colección</h2>

				{#each schema.fields as field (field.key)}
					<div>
						<label class="block text-xs text-gray-600 mb-1" for="dyn-{field.key}">
							{field.label}
						</label>

						{#if Array.isArray(fields[field.key])}
							<textarea
								id="dyn-{field.key}"
								name={field.key}
								rows={6}
								class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
							>{fieldValue(field.key)}</textarea>
							<p class="text-xs text-gray-400 mt-1">Un elemento por línea.</p>
						{:else if field.type === 'textarea'}
							<textarea
								id="dyn-{field.key}"
								name={field.key}
								rows={6}
								class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
							>{fieldValue(field.key)}</textarea>
						{:else if field.type === 'select'}
							<select
								id="dyn-{field.key}"
								name={field.key}
								class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							>
								{#each field.options ?? [] as opt (opt)}
									<option value={opt} selected={fieldValue(field.key) === opt}>{opt}</option>
								{/each}
							</select>
						{:else}
							<input
								id="dyn-{field.key}"
								name={field.key}
								type="text"
								value={fieldValue(field.key)}
								class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<div class="flex items-center gap-3">
			<button
				type="submit"
				class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
			>
				Guardar cambios
			</button>
		</div>
	</form>
</div>
