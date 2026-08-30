<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import MetadataEditor from '$lib/components/MetadataEditor.svelte';
	import Button from '$lib/components/Button.svelte';
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
	<div class="flex items-center gap-2 text-sm text-subtle flex-wrap">
		<a href="/dashboard" class="hover:text-ink">Proyectos</a>
		<span>/</span>
		<a href="/projects/{data.project.id}" class="hover:text-ink">{data.project.name}</a>
		<span>/</span>
		<a href="/projects/{data.project.id}/pages" class="hover:text-ink">Páginas</a>
		<span>/</span>
		<span class="text-ink font-medium">{data.page.title}</span>
		<span>/</span>
		<span class="text-ink font-medium">SEO</span>
	</div>

	<!-- Sub-nav: Bloques | SEO -->
	<div class="flex gap-1 border-b border-border-subtle">
		<a
			href="/projects/{data.project.id}/pages/{data.page.id}/blocks"
			class="px-4 py-2 text-sm font-medium text-subtle hover:text-ink transition-colors"
		>
			Bloques
		</a>
		<a
			href="/projects/{data.project.id}/pages/{data.page.id}/metadata"
			class="px-4 py-2 text-sm font-medium border-b-2 border-primary text-primary -mb-px"
		>
			SEO
		</a>
	</div>

	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold text-ink">Metadatos SEO</h1>
			<p class="text-sm text-subtle font-mono mt-0.5">{data.page.full_path}</p>
		</div>
	</div>

	{#if form?.error}
		<div class="bg-red-50 border border-red-200 text-danger-hover text-sm px-4 py-3 rounded-md">
			{form.error}
		</div>
	{/if}

	{#if form?.success}
		<div class="bg-green-50 border border-green-200 text-success-hover text-sm px-4 py-3 rounded-md">
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
		class="bg-white border border-border-subtle rounded-lg p-6 space-y-6"
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

		<div class="flex items-center justify-between pt-4 border-t border-border-faint">
			<a
				href="/projects/{data.project.id}/pages"
				class="text-sm text-subtle hover:text-ink"
			>
				&larr; Volver a páginas
			</a>
			<Button type="submit" loading={saving}>Guardar metadatos</Button>
		</div>
	</form>
</div>
