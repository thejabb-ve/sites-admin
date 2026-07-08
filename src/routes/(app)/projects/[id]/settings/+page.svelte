<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { toast } from '$lib/toast.svelte';
	import type { PageData, ActionData } from './$types';
	import type { ActionResult } from '@sveltejs/kit';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let ga4Id          = $state(untrack(() => data.project.ga4_id          ?? ''));
	let siteName       = $state(untrack(() => data.project.site_name        ?? ''));
	let titleSeparator = $state(untrack(() => data.project.title_separator  ?? ' | '));
	let defaultRobots  = $state(untrack(() => data.project.default_robots   ?? 'index, follow'));
	let canonicalDomain = $state(untrack(() => data.project.canonical_domain ?? ''));
	let twitterHandle  = $state(untrack(() => data.project.twitter_handle   ?? ''));

	let savingGa4  = $state(false);
	let savingSite = $state(false);

	function onResult(successMsg: string) {
		return async ({ result, update }: { result: ActionResult; update: () => Promise<void> }) => {
			await update();
			if (result.type === 'success') {
				toast('success', successMsg);
			} else if (result.type === 'failure' && (result.data as Record<string, unknown>)?.error) {
				toast('error', String((result.data as Record<string, unknown>).error));
			}
		};
	}

	const titlePreview = $derived(
		siteName
			? `Página de ejemplo${titleSeparator}${siteName}`
			: 'Configura un nombre de sitio para ver la vista previa'
	);
</script>

<svelte:head><title>Configuración — {siteName || data.project.name}</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center gap-2 text-sm text-gray-500">
		<a href="/dashboard" class="hover:text-gray-900">Proyectos</a>
		<span>/</span>
		<a href="/projects/{data.project.id}" class="hover:text-gray-900">{data.project.name}</a>
		<span>/</span>
		<span class="text-gray-900 font-medium">Configuración</span>
	</div>

	<h1 class="text-xl font-semibold text-gray-900">Configuración del proyecto</h1>

	<!-- Identidad del sitio -->
	<div class="bg-white border border-gray-200 rounded-lg p-5">
		<h2 class="text-sm font-semibold text-gray-700 mb-1">Identidad del sitio</h2>
		<p class="text-xs text-gray-500 mb-4">
			Controla cómo aparece el sitio en buscadores y resultados de búsqueda.
		</p>

		<form
			method="POST"
			action="?/saveSiteConfig"
			use:enhance={() => {
				savingSite = true;
				return async (ctx) => { await onResult('Identidad del sitio guardada correctamente.')(ctx); savingSite = false; };
			}}
			class="space-y-4"
		>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<div>
					<label class="block text-xs text-gray-600 mb-1" for="site_name">
						Nombre del sitio
					</label>
					<input
						id="site_name"
						name="site_name"
						type="text"
						bind:value={siteName}
						placeholder="SIMUN"
						class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>
				<div>
					<label class="block text-xs text-gray-600 mb-1" for="title_separator">
						Separador del título
					</label>
					<select
						id="title_separator"
						name="title_separator"
						bind:value={titleSeparator}
						class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value=" | "> | </option>
						<option value=" — "> — </option>
						<option value=" · "> · </option>
						<option value=" - "> - </option>
					</select>
				</div>
			</div>

			<!-- Vista previa del título -->
			<div class="bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
				<p class="text-xs text-gray-500 mb-0.5">Vista previa en Google</p>
				<p class="text-sm text-blue-700 truncate">{titlePreview}</p>
			</div>

			<div>
				<label class="block text-xs text-gray-600 mb-1" for="default_robots">
					Indexación por defecto (para páginas nuevas)
				</label>
				<select
					id="default_robots"
					name="default_robots"
					bind:value={defaultRobots}
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				>
					<option value="index, follow">Indexar (recomendado)</option>
					<option value="noindex, follow">No indexar páginas nuevas</option>
					<option value="noindex, nofollow">No indexar y no seguir enlaces</option>
					<option value="index, nofollow">Indexar pero no seguir enlaces</option>
				</select>
			</div>

			<div>
				<label class="block text-xs text-gray-600 mb-1" for="canonical_domain">
					Dominio canónico
					<span class="text-gray-400">(base para URLs canónicas automáticas)</span>
				</label>
				<input
					id="canonical_domain"
					name="canonical_domain"
					type="url"
					bind:value={canonicalDomain}
					placeholder="https://sanignaciomun.com"
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
				{#if canonicalDomain}
					<p class="mt-1 text-xs text-gray-400">
						Ejemplo: <span class="font-mono">{canonicalDomain}/nosotros</span>
					</p>
				{/if}
			</div>

			<div>
				<label class="block text-xs text-gray-600 mb-1" for="twitter_handle">
					Handle de Twitter / X
					<span class="text-gray-400">(con o sin @)</span>
				</label>
				<input
					id="twitter_handle"
					name="twitter_handle"
					type="text"
					bind:value={twitterHandle}
					placeholder="@simun"
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>

			<div class="flex justify-end">
				<button
					type="submit"
					disabled={savingSite}
					class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
				>
					{savingSite ? 'Guardando…' : 'Guardar identidad'}
				</button>
			</div>
		</form>
	</div>

	<!-- Google Analytics -->
	<div class="bg-white border border-gray-200 rounded-lg p-5">
		<h2 class="text-sm font-semibold text-gray-700 mb-1">Google Analytics 4</h2>
		<p class="text-xs text-gray-500 mb-4">
			El código de seguimiento se inyecta automáticamente en el sitio público. Deja vacío para desactivar.
		</p>

		<form
			method="POST"
			action="?/saveGa4"
			use:enhance={() => {
				savingGa4 = true;
				return async (ctx) => { await onResult('Google Analytics guardado correctamente.')(ctx); savingGa4 = false; };
			}}
			class="flex items-end gap-3"
		>
			<div class="flex-1">
				<label class="block text-xs text-gray-600 mb-1" for="ga4_id">
					Measurement ID
				</label>
				<input
					id="ga4_id"
					name="ga4_id"
					type="text"
					bind:value={ga4Id}
					placeholder="G-XXXXXXXXXX"
					pattern="G-[A-Z0-9]+"
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>
			<button
				type="submit"
				disabled={savingGa4}
				class="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
			>
				{savingGa4 ? 'Guardando…' : 'Guardar'}
			</button>
		</form>

		{#if ga4Id}
			<p class="mt-2 text-xs text-green-600">
				Analytics activo: <span class="font-mono">{ga4Id}</span>
			</p>
		{/if}
	</div>
</div>
