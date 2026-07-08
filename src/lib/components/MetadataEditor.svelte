<script lang="ts">
	import { untrack } from 'svelte';

	interface Props {
		seoTitle:       string;
		seoDescription: string;
		robots:         string;
		ogTitle:        string;
		ogDescription:  string;
		ogImageUrl:     string;
		canonicalUrl:   string;
	}

	let {
		seoTitle       = $bindable(''),
		seoDescription = $bindable(''),
		robots         = $bindable('index, follow'),
		ogTitle        = $bindable(''),
		ogDescription  = $bindable(''),
		ogImageUrl     = $bindable(''),
		canonicalUrl   = $bindable(''),
	}: Props = $props();

	// ── Termómetro de caracteres ──────────────────────────────────────
	type BarCfg = { min: number; ok: number; max: number; cap: number };

	// SEO Title:  óptimo 50–70, tolerable hasta 90
	// SEO Desc:   óptima 120–160, tolerable hasta 200
	const TITLE_BAR: BarCfg = { min: 30,  ok: 50,  max: 70,  cap: 90  };
	const DESC_BAR:  BarCfg = { min: 80,  ok: 120, max: 160, cap: 200 };

	function barColor(len: number, c: BarCfg): 'red' | 'amber' | 'green' {
		if (len === 0)    return 'red';
		if (len < c.min)  return 'red';
		if (len <= c.ok)  return 'amber';
		if (len <= c.max) return 'green';
		if (len <= c.cap) return 'amber';
		return 'red';
	}
	function barPct(len: number, c: BarCfg): number {
		return Math.min(100, (len / c.cap) * 100);
	}

	const titleLen   = $derived(seoTitle.length);
	const descLen    = $derived(seoDescription.length);
	const titleColor = $derived(barColor(titleLen, TITLE_BAR));
	const descColor  = $derived(barColor(descLen,  DESC_BAR));
	const titlePct   = $derived(barPct(titleLen, TITLE_BAR));
	const descPct    = $derived(barPct(descLen,  DESC_BAR));

	const colorMap = {
		red:   { fill: '#ef4444', text: 'text-red-500'   },
		amber: { fill: '#f59e0b', text: 'text-amber-500' },
		green: { fill: '#16a34a', text: 'text-green-600' },
	} as const;

	const previewTitle = $derived(seoTitle || '(Sin título SEO)');
	const previewDesc  = $derived(seoDescription || '(Sin descripción)');

	let showCanonical = $state(untrack(() => !!canonicalUrl));
</script>

<div class="space-y-6">
	<!-- SEO title -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1" for="seo_title">
			Título SEO
		</label>
		<input
			id="seo_title"
			name="seo_title"
			type="text"
			bind:value={seoTitle}
			placeholder="Título que aparece en Google (recomendado: 50–70 caracteres)"
			class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
		/>
		<div class="mt-1.5 flex items-center gap-2">
			<div class="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
				<div
					class="h-full rounded-full transition-all duration-200"
					style="width:{titlePct}%; background-color:{colorMap[titleColor].fill}"
				></div>
			</div>
			<span class="text-xs font-medium flex-shrink-0 {colorMap[titleColor].text}">
				{titleLen} / 70
			</span>
		</div>
	</div>

	<!-- SEO description -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1" for="seo_description">
			Descripción SEO
		</label>
		<textarea
			id="seo_description"
			name="seo_description"
			rows="3"
			bind:value={seoDescription}
			placeholder="Descripción que aparece en Google (recomendado: 120–160 caracteres)"
			class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
		></textarea>
		<div class="mt-1.5 flex items-center gap-2">
			<div class="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
				<div
					class="h-full rounded-full transition-all duration-200"
					style="width:{descPct}%; background-color:{colorMap[descColor].fill}"
				></div>
			</div>
			<span class="text-xs font-medium flex-shrink-0 {colorMap[descColor].text}">
				{descLen} / 160
			</span>
		</div>
	</div>

	<!-- Robots -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-1" for="robots">
			Indexación en buscadores
		</label>
		<select
			id="robots"
			name="robots"
			bind:value={robots}
			class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
		>
			<option value="index, follow">Indexar (recomendado)</option>
			<option value="noindex, follow">No indexar esta página</option>
			<option value="noindex, nofollow">No indexar y no seguir enlaces</option>
			<option value="index, nofollow">Indexar pero no seguir enlaces</option>
		</select>
	</div>

	<!-- Open Graph -->
	<fieldset class="border border-gray-200 rounded-lg p-4">
		<legend class="text-sm font-medium text-gray-700 px-1">Open Graph (redes sociales)</legend>
		<div class="space-y-4 mt-2">
			<div>
				<label class="block text-xs text-gray-600 mb-1" for="og_title">
					Título OG <span class="text-gray-400">(si está vacío usa el título SEO)</span>
				</label>
				<input
					id="og_title"
					name="og_title"
					type="text"
					bind:value={ogTitle}
					placeholder={seoTitle || 'Título para compartir en redes'}
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>
			<div>
				<label class="block text-xs text-gray-600 mb-1" for="og_description">
					Descripción OG <span class="text-gray-400">(si está vacío usa la descripción SEO)</span>
				</label>
				<textarea
					id="og_description"
					name="og_description"
					rows="2"
					bind:value={ogDescription}
					placeholder={seoDescription || 'Descripción para compartir en redes'}
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
				></textarea>
			</div>
			<div>
				<label class="block text-xs text-gray-600 mb-1" for="og_image_url">
					Imagen OG <span class="text-gray-400">(URL de imagen 1200×630 px)</span>
				</label>
				<input
					id="og_image_url"
					name="og_image_url"
					type="url"
					bind:value={ogImageUrl}
					placeholder="https://cdn.ejemplo.com/imagen-og.jpg"
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
				/>
			</div>
		</div>
	</fieldset>

	<!-- URL canónica -->
	<div>
		<label class="flex items-center gap-2 cursor-pointer select-none">
			<input
				type="checkbox"
				bind:checked={showCanonical}
				class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
			/>
			<span class="text-sm font-medium text-gray-700">URL canónica personalizada</span>
		</label>
		{#if showCanonical}
			<input
				name="canonical_url"
				type="url"
				bind:value={canonicalUrl}
				placeholder="https://ejemplo.com/pagina-original"
				class="mt-2 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
			/>
		{:else}
			<input type="hidden" name="canonical_url" value="" />
		{/if}
	</div>

	<!-- Preview de tarjeta de búsqueda -->
	<div>
		<p class="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
			Previsualización en Google
		</p>
		<div class="border border-gray-200 rounded-lg p-4 bg-white max-w-xl">
			<p class="text-blue-700 text-base font-medium truncate">{previewTitle}</p>
			<p class="text-green-700 text-xs mt-0.5">ejemplo.com › esta-pagina</p>
			<p class="text-gray-600 text-sm mt-1 line-clamp-2">{previewDesc}</p>
		</div>
	</div>
</div>
