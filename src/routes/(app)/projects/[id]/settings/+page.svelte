<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { toast } from '$lib/toast.svelte';
	import AssetPicker from '$lib/components/AssetPicker.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { PageData } from './$types';
	import type { ActionResult } from '@sveltejs/kit';

	let { data }: { data: PageData } = $props();

	let ga4Id          = $state(untrack(() => data.project.ga4_id          ?? ''));
	let siteName       = $state(untrack(() => data.project.site_name        ?? ''));
	let titleSeparator = $state(untrack(() => data.project.title_separator  ?? ' | '));
	let defaultRobots  = $state(untrack(() => data.project.default_robots   ?? 'index, follow'));
	let canonicalDomain = $state(untrack(() => data.project.canonical_domain ?? ''));
	let twitterHandle  = $state(untrack(() => data.project.twitter_handle   ?? ''));
	let faviconUrl     = $state(untrack(() => data.brand?.favicon_url  ?? ''));
	let ogImageUrl     = $state(untrack(() => data.brand?.og_image_url ?? ''));

	let savingGa4    = $state(false);
	let savingSite   = $state(false);
	let savingAssets = $state(false);
	let confirmPurge = $state(false);
	let purging      = $state(false);

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

	async function handlePurge() {
		confirmPurge = false;
		purging = true;
		try {
			const res = await fetch(`/api/projects/${data.project.id}/purge`, { method: 'POST' });
			if (res.ok) toast('success', 'Caché purgada correctamente.');
			else        toast('error', 'Error al purgar la caché. Inténtalo de nuevo.');
		} catch {
			toast('error', 'Error de red al purgar la caché.');
		} finally {
			purging = false;
		}
	}

	const titlePreview = $derived(
		siteName
			? `Página de ejemplo${titleSeparator}${siteName}`
			: 'Configura un nombre de sitio para ver la vista previa'
	);
</script>

<svelte:head><title>Configuración — {siteName || data.project.name}</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center gap-2 text-sm text-subtle">
		<a href="/dashboard" class="hover:text-ink">Proyectos</a>
		<span>/</span>
		<a href="/projects/{data.project.id}" class="hover:text-ink">{data.project.name}</a>
		<span>/</span>
		<span class="text-ink font-medium">Configuración</span>
	</div>

	<h1 class="text-xl font-semibold text-ink">Configuración del proyecto</h1>

	<!-- Identidad del sitio -->
	<div class="bg-white border border-border-subtle rounded-lg p-5">
		<h2 class="text-sm font-semibold text-body mb-1">Identidad del sitio</h2>
		<p class="text-xs text-subtle mb-4">
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
					<label class="block text-xs text-muted mb-1" for="site_name">
						Nombre del sitio
					</label>
					<input
						id="site_name"
						name="site_name"
						type="text"
						bind:value={siteName}
						placeholder="SIMUN"
						class="w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
				</div>
				<div>
					<label class="block text-xs text-muted mb-1" for="title_separator">
						Separador del título
					</label>
					<select
						id="title_separator"
						name="title_separator"
						bind:value={titleSeparator}
						class="w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					>
						<option value=" | "> | </option>
						<option value=" — "> — </option>
						<option value=" · "> · </option>
						<option value=" - "> - </option>
					</select>
				</div>
			</div>

			<!-- Vista previa del título -->
			<div class="bg-surface-muted border border-border-subtle rounded-md px-3 py-2">
				<p class="text-xs text-subtle mb-0.5">Vista previa en Google</p>
				<p class="text-sm text-primary-hover truncate">{titlePreview}</p>
			</div>

			<div>
				<label class="block text-xs text-muted mb-1" for="default_robots">
					Indexación por defecto (para páginas nuevas)
				</label>
				<select
					id="default_robots"
					name="default_robots"
					bind:value={defaultRobots}
					class="w-full border border-border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				>
					<option value="index, follow">Indexar (recomendado)</option>
					<option value="noindex, follow">No indexar páginas nuevas</option>
					<option value="noindex, nofollow">No indexar y no seguir enlaces</option>
					<option value="index, nofollow">Indexar pero no seguir enlaces</option>
				</select>
			</div>

			<div>
				<label class="block text-xs text-muted mb-1" for="canonical_domain">
					Dominio canónico
					<span class="text-faint">(base para URLs canónicas automáticas)</span>
				</label>
				<input
					id="canonical_domain"
					name="canonical_domain"
					type="url"
					bind:value={canonicalDomain}
					placeholder="https://sanignaciomun.com"
					class="w-full border border-border rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
				{#if canonicalDomain}
					<p class="mt-1 text-xs text-faint">
						Ejemplo: <span class="font-mono">{canonicalDomain}/nosotros</span>
					</p>
				{/if}
			</div>

			<div>
				<label class="block text-xs text-muted mb-1" for="twitter_handle">
					Handle de Twitter / X
					<span class="text-faint">(con o sin @)</span>
				</label>
				<input
					id="twitter_handle"
					name="twitter_handle"
					type="text"
					bind:value={twitterHandle}
					placeholder="@simun"
					class="w-full border border-border rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>

			<div class="flex justify-end">
				<Button type="submit" loading={savingSite}>Guardar identidad</Button>
			</div>
		</form>
	</div>

	<!-- Activos SEO -->
	<div class="bg-white border border-border-subtle rounded-lg p-5">
		<h2 class="text-sm font-semibold text-body mb-1">Activos SEO</h2>
		<p class="text-xs text-subtle mb-4">
			Favicon y imagen Open Graph por defecto para todas las páginas del sitio.
		</p>

		<form
			method="POST"
			action="?/saveAssets"
			use:enhance={() => {
				savingAssets = true;
				return async (ctx) => { await onResult('Activos SEO guardados correctamente.')(ctx); savingAssets = false; };
			}}
			class="space-y-4"
		>
			<input type="hidden" name="favicon_url"  value={faviconUrl} />
			<input type="hidden" name="og_image_url" value={ogImageUrl} />

			<div>
				<p class="block text-xs text-muted mb-2">Favicon</p>
				<AssetPicker
					value={faviconUrl}
					onSelect={(url) => { faviconUrl = url; }}
				/>
			</div>

			<div>
				<p class="block text-xs text-muted mb-2">
					Imagen Open Graph por defecto
					<span class="text-faint">(se usa cuando una página no tiene OG image propia)</span>
				</p>
				<AssetPicker
					value={ogImageUrl}
					onSelect={(url) => { ogImageUrl = url; }}
				/>
			</div>

			<div class="flex justify-end">
				<Button type="submit" loading={savingAssets}>Guardar activos</Button>
			</div>
		</form>
	</div>

	<!-- Google Analytics -->
	<div class="bg-white border border-border-subtle rounded-lg p-5">
		<h2 class="text-sm font-semibold text-body mb-1">Google Analytics 4</h2>
		<p class="text-xs text-subtle mb-4">
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
				<label class="block text-xs text-muted mb-1" for="ga4_id">
					Measurement ID
				</label>
				<input
					id="ga4_id"
					name="ga4_id"
					type="text"
					bind:value={ga4Id}
					placeholder="G-XXXXXXXXXX"
					pattern="G-[A-Z0-9]+"
					class="w-full border border-border rounded-md px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>
			<Button type="submit" loading={savingGa4}>Guardar</Button>
		</form>

		{#if ga4Id}
			<p class="mt-2 text-xs text-green-600">
				Analytics activo: <span class="font-mono">{ga4Id}</span>
			</p>
		{/if}
	</div>

	<!-- Caché -->
	<div class="bg-white border border-border-subtle rounded-lg p-5">
		<h2 class="text-sm font-semibold text-body mb-1">Caché del sitio</h2>
		<p class="text-xs text-subtle mb-4">
			Fuerza la recarga de todo el sitio público desde cero.
			Úsalo si los cambios no se reflejan después de unos segundos.
		</p>
		<Button
			variant="danger"
			onclick={() => confirmPurge = true}
			loading={purging}
			loadingLabel="Purgando…"
		>
			Purgar caché
		</Button>
	</div>
</div>

<ConfirmDialog
	bind:open={confirmPurge}
	title="¿Purgar caché del sitio?"
	message="Se invalidará la caché de todas las páginas del proyecto en Cloudflare. Los cambios serán visibles de inmediato."
	confirmLabel="Sí, purgar"
	danger={true}
	onConfirm={handlePurge}
	onCancel={() => confirmPurge = false}
/>
