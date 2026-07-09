<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import MetadataEditor from '$lib/components/MetadataEditor.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let seoTitle       = $state(untrack(() => data.page.seo_title ?? ''));
	let seoDescription = $state(untrack(() => data.page.seo_description ?? ''));
	let robots         = $state(untrack(() => data.page.robots ?? 'index, follow'));
	let ogTitle        = $state(untrack(() => data.page.og_title ?? ''));
	let ogDescription  = $state(untrack(() => data.page.og_description ?? ''));
	let ogImageUrl     = $state(untrack(() => data.page.og_image_url ?? ''));
	let canonicalUrl   = $state(untrack(() => data.page.canonical_url ?? ''));

	let saving = $state(false);
</script>

<svelte:head><title>Metadatos SEO — {data.page.title} — {data.project.name}</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
		<a href="/dashboard" class="hover:text-gray-900">Proyectos</a>
		<span>/</span>
		<a href="/projects/{data.project.id}" class="hover:text-gray-900">{data.project.name}</a>
		<span>/</span>
		<a href="/projects/{data.project.id}/pages" class="hover:text-gray-900">Páginas</a>
		<span>/</span>
		<span class="text-gray-900 font-medium">{data.page.title}</span>
		<span>/</span>
		<span class="text-gray-900 font-medium">SEO</span>
	</div>

	<!-- Sub-nav: Bloques | SEO -->
	<div class="flex gap-1 border-b border-gray-200">
		<a
			href="/projects/{data.project.id}/pages/{data.page.id}/blocks"
			class="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
		>
			Bloques
		</a>
		<a
			href="/projects/{data.project.id}/pages/{data.page.id}/metadata"
			class="px-4 py-2 text-sm font-medium border-b-2 border-blue-600 text-blue-600 -mb-px"
		>
			SEO
		</a>
	</div>

	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold text-gray-900">Metadatos SEO</h1>
			<p class="text-sm text-gray-500 font-mono mt-0.5">{data.page.full_path}</p>
		</div>
	</div>

	{#if form?.error}
		<div class="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">
			Metadatos guardados correctamente.
		</div>
	{/if}

	<form
		method="POST"
		action="?/save"
		use:enhance={() => {
			saving = true;
			return async ({ update }) => {
				await update();
				saving = false;
			};
		}}
		class="bg-white border border-gray-200 rounded-lg p-6 space-y-6"
	>
		<MetadataEditor
			bind:seoTitle
			bind:seoDescription
			bind:robots
			bind:ogTitle
			bind:ogDescription
			bind:ogImageUrl
			bind:canonicalUrl
		/>

		<div class="flex items-center justify-between pt-4 border-t border-gray-100">
			<a
				href="/projects/{data.project.id}/pages"
				class="text-sm text-gray-500 hover:text-gray-900"
			>
				&larr; Volver a páginas
			</a>
			<button
				type="submit"
				disabled={saving}
				class="px-5 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
			>
				{saving ? 'Guardando…' : 'Guardar metadatos'}
			</button>
		</div>
	</form>
</div>
