<script lang="ts">
	import { untrack }      from 'svelte';
	import { enhance }      from '$app/forms';
	import { goto }         from '$app/navigation';
	import { toast }        from '$lib/toast.svelte';
	import OklchPicker      from '$lib/components/OklchPicker.svelte';
	import FontSpecEditor   from '$lib/components/FontSpecEditor.svelte';
	import ConfirmDialog    from '$lib/components/ConfirmDialog.svelte';
	import type { FontSpec } from './+page.server';
	import type { PageData } from './$types';
	import type { ActionResult } from '@sveltejs/kit';

	let { data }: { data: PageData } = $props();

	// ─── Constantes ────────────────────────────────────────────────────────────

	const DEFAULT_COLORS: Record<string, string> = {
		primary:        'oklch(0.5 0.15 250)',
		primary_fg:     'oklch(1 0 0)',
		primary_hover:  'oklch(0.45 0.15 250)',
		primary_active: 'oklch(0.4 0.15 250)',
		accent:         'oklch(0.55 0.18 300)',
		accent_fg:      'oklch(1 0 0)',
		accent_hover:   'oklch(0.5 0.18 300)',
		background:     'oklch(1 0 0)',
		surface:        'oklch(0.97 0 0)',
		text:           'oklch(0.15 0 0)',
		text_muted:     'oklch(0.5 0 0)',
		border:         'oklch(0.88 0 0)',
		success:        'oklch(0.55 0.15 145)',
		warning:        'oklch(0.65 0.18 75)',
		error:          'oklch(0.55 0.2 25)',
		link:           'oklch(0.5 0.15 250)',
		link_hover:     'oklch(0.4 0.15 250)',
	};

	const DEFAULT_FONT: FontSpec = { family: 'Inter', weights: [400, 500, 700], source: 'google' };

	const COLOR_LABELS: Record<string, string> = {
		primary:        'Primario',
		primary_fg:     'Primario (texto)',
		primary_hover:  'Primario hover',
		primary_active: 'Primario activo',
		accent:         'Acento',
		accent_fg:      'Acento (texto)',
		accent_hover:   'Acento hover',
		background:     'Fondo',
		surface:        'Superficie',
		text:           'Texto',
		text_muted:     'Texto atenuado',
		border:         'Borde',
		success:        'Éxito',
		warning:        'Advertencia',
		error:          'Error',
		link:           'Enlace',
		link_hover:     'Enlace hover',
	};

	const COLOR_KEYS    = Object.keys(DEFAULT_COLORS);
	const RADII_KEYS    = ['none', 'sm', 'md', 'lg', 'xl', 'full'];
	const SHADOW_KEYS   = ['sm', 'md', 'lg', 'xl'];
	const TYPO_SCALE: Array<[string, string, string]> = [
		['size_base',   'Tamaño base', '1rem'],
		['line_height', 'Interlineado', '1.5'],
		['tracking',    'Tracking',    '0em'],
	];

	type Tab = 'colors' | 'dark' | 'typography' | 'tokens' | 'legal' | 'css';
	const TABS: Array<[Tab, string]> = [
		['colors',     'Colores'],
		['dark',       'Dark mode'],
		['typography', 'Tipografía'],
		['tokens',     'Tokens'],
		['legal',      'Legal'],
		['css',        'CSS custom'],
	];

	// ─── Estado ────────────────────────────────────────────────────────────────

	const s = untrack(() => data.effectiveState);

	let colors     = $state<Record<string, string>>(
		untrack(() => ({ ...DEFAULT_COLORS, ...(s?.colors ?? {}) }))
	);
	let colorsDark = $state<Record<string, string>>(
		untrack(() => ({ ...(s?.colors_dark ?? {}) }))
	);
	let darkEnabled = $state<Record<string, boolean>>(
		untrack(() => {
			const enabled: Record<string, boolean> = {};
			for (const k of COLOR_KEYS) enabled[k] = k in (s?.colors_dark ?? {});
			return enabled;
		})
	);
	let typography = $state({
		display:     (s?.typography?.display     ?? DEFAULT_FONT) as FontSpec,
		body:        (s?.typography?.body        ?? DEFAULT_FONT) as FontSpec,
		mono:        (s?.typography?.mono                       ) as FontSpec | undefined,
		size_base:   s?.typography?.size_base   ?? '1rem',
		line_height: s?.typography?.line_height ?? '1.5',
		tracking:    s?.typography?.tracking    ?? '0em',
	});
	let monoEnabled = $state(!!s?.typography?.mono);
	let radii    = $state<Record<string, string>>(untrack(() => ({
		none: '0px', sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px',
		...(s?.radii ?? {}),
	})));
	let shadows  = $state<Record<string, string>>(untrack(() => ({
		sm: '0 1px 2px 0 oklch(0 0 0 / 0.05)',
		md: '0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1)',
		lg: '0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1)',
		...(s?.shadows ?? {}),
	})));
	let spacing  = $state({ scale: s?.spacing?.scale ?? 1 });
	let layout   = $state({
		max_width_content: s?.layout?.max_width_content ?? '1280px',
		max_width_prose:   s?.layout?.max_width_prose   ?? '65ch',
	});
	let legalAddress = $state(s?.legal_info?.address ?? '');
	let legalLinks   = $state<{ label: string; href: string }[]>(
		untrack(() => (s?.legal_info?.legalLinks ?? []).map(l => ({ ...l })))
	);
	let customCss    = $state(s?.custom_css ?? '');

	// ─── Serialización ─────────────────────────────────────────────────────────

	let draftJson = $derived(JSON.stringify({
		colors,
		colors_dark: Object.fromEntries(
			Object.entries(colorsDark).filter(([k]) => darkEnabled[k])
		),
		typography: {
			...typography,
			mono: monoEnabled ? (typography.mono ?? DEFAULT_FONT) : undefined,
		},
		radii,
		shadows,
		spacing,
		layout,
		legal_info: {
			address:    legalAddress || undefined,
			legalLinks: legalLinks.length ? legalLinks : undefined,
		},
		custom_css: customCss || null,
	}));

	// ─── UI state ──────────────────────────────────────────────────────────────

	let activeTab:  Tab     = $state('colors');
	let iframeKey           = $state(0);
	let hasDraft            = $state(
		untrack(() => data.manual?.draft_overrides !== null && data.manual?.draft_overrides !== undefined)
	);
	let savingDraft  = $state(false);
	let publishing   = $state(false);
	let confirmOpen  = $state(false);

	let draftFormEl   = $state<HTMLFormElement | undefined>();
	let publishFormEl = $state<HTMLFormElement | undefined>();

	function openConfirm() { confirmOpen = true; }
	function doPublish()   { publishFormEl?.requestSubmit(); }

	// ─── Helpers colores dark ───────────────────────────────────────────────────

	function toggleDark(k: string) {
		darkEnabled = { ...darkEnabled, [k]: !darkEnabled[k] };
		if (darkEnabled[k] && !(k in colorsDark)) {
			colorsDark = { ...colorsDark, [k]: colors[k] ?? DEFAULT_COLORS[k] ?? 'oklch(0.5 0.15 250)' };
		}
	}
	function setDark(k: string, v: string) {
		colorsDark = { ...colorsDark, [k]: v };
	}

	// ─── Helpers legal links ────────────────────────────────────────────────────

	function addLegalLink()          { legalLinks = [...legalLinks, { label: '', href: '' }]; }
	function removeLegalLink(i: number) { legalLinks = legalLinks.filter((_, idx) => idx !== i); }
	function updateLegalLink(i: number, field: 'label' | 'href', val: string) {
		legalLinks = legalLinks.map((l, idx) => idx === i ? { ...l, [field]: val } : l);
	}

	// ─── Helper tipografía escala ───────────────────────────────────────────────

	function setTypoField(key: string, val: string) {
		typography = { ...typography, [key]: val };
	}
</script>

<svelte:head><title>Marca — {data.project.name}</title></svelte:head>

<!-- Formularios ocultos -->
<form
	method="POST"
	action="?/saveDraft"
	bind:this={draftFormEl}
	use:enhance={() => {
		savingDraft = true;
		return async ({ result, update }: { result: ActionResult; update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			savingDraft = false;
			if (result.type === 'success') {
				hasDraft = true;
				iframeKey++;
				toast('success', 'Borrador guardado.');
			} else if (result.type === 'failure') {
				toast('error', (result.data as Record<string, string>)?.error ?? 'Error al guardar.');
			}
		};
	}}
>
	<input type="hidden" name="draft" value={draftJson} />
</form>

<form
	method="POST"
	action="?/publish"
	bind:this={publishFormEl}
	use:enhance={() => {
		publishing = true;
		const projectId = untrack(() => data.project.id);
		return async ({ result, update }: { result: ActionResult; update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			publishing = false;
			if (result.type === 'success') {
				toast('success', 'Manual publicado correctamente.');
				await goto(`/projects/${projectId}/brand`, { invalidateAll: true });
			} else if (result.type === 'failure') {
				toast('error', (result.data as Record<string, string>)?.error ?? 'Error al publicar.');
			}
		};
	}}
>
	<input type="hidden" name="manual"  value={draftJson} />
	<input type="hidden" name="version" value={data.manual?.version ?? 0} />
</form>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Publicar brand manual"
	message="Los cambios serán visibles en el sitio público inmediatamente. ¿Continuar?"
	confirmLabel="Publicar"
	onConfirm={doPublish}
/>

<!-- ─── Página ───────────────────────────────────────────────────────────── -->
<div class="space-y-6">

	<!-- Breadcrumb -->
	<div class="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
		<a href="/dashboard" class="hover:text-gray-900">Proyectos</a>
		<span>/</span>
		<a href="/projects/{data.project.id}" class="hover:text-gray-900">{data.project.name}</a>
		<span>/</span>
		<span class="text-gray-900 font-medium">Marca</span>
	</div>

	<!-- Título + badge + botones -->
	<div class="flex items-center justify-between flex-wrap gap-3">
		<div class="flex items-center gap-3">
			<h1 class="text-xl font-semibold text-gray-900">Manual de marca</h1>
			{#if hasDraft}
				<span class="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
					BORRADOR
				</span>
			{/if}
			{#if data.manual?.version}
				<span class="text-xs text-gray-400">v{data.manual.version}</span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => draftFormEl?.requestSubmit()}
				disabled={savingDraft}
				class="px-4 py-2 text-sm border border-gray-300 rounded-md text-gray-700 hover:border-gray-400 transition-colors disabled:opacity-50"
			>
				{savingDraft ? 'Guardando…' : 'Guardar borrador'}
			</button>
			<button
				type="button"
				onclick={openConfirm}
				disabled={publishing}
				class="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
			>
				{publishing ? 'Publicando…' : 'Publicar'}
			</button>
		</div>
	</div>

	{#if !data.manual}
		<div class="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
			Este proyecto no tiene un manual de marca aún. Completa los campos y haz clic en <strong>Publicar</strong> para crearlo.
		</div>
	{/if}

	<!-- Layout: editor + preview -->
	<div class="flex gap-6 items-start">

		<!-- ── Editor ── -->
		<div class="flex-1 min-w-0 space-y-4">

			<!-- Tabs -->
			<div class="flex gap-1 border-b border-gray-200 overflow-x-auto">
				{#each TABS as [tabId, tabLabel] (tabId)}
					<button
						type="button"
						onclick={() => { activeTab = tabId; }}
						class="px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors
							{activeTab === tabId
								? 'border-blue-600 text-blue-600'
								: 'border-transparent text-gray-500 hover:text-gray-700'}"
					>
						{tabLabel}
					</button>
				{/each}
			</div>

			<!-- ── Colores ── -->
			{#if activeTab === 'colors'}
				<div class="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
					{#each COLOR_KEYS as k (k)}
						<div>
							<p class="text-sm font-medium text-gray-700 mb-2">{COLOR_LABELS[k] ?? k}</p>
							<OklchPicker
								value={colors[k] ?? DEFAULT_COLORS[k] ?? 'oklch(0.5 0.15 250)'}
								onUpdate={(v) => { colors = { ...colors, [k]: v }; }}
							/>
						</div>
					{/each}
				</div>

			<!-- ── Dark mode ── -->
			{:else if activeTab === 'dark'}
				<div class="bg-white border border-gray-200 rounded-lg p-6 space-y-5">
					<p class="text-sm text-gray-500">
						Activa los colores que quieres sobreescribir en modo oscuro. Los desactivados heredan el valor light.
					</p>
					{#each COLOR_KEYS as k (k)}
						<div>
							<div class="flex items-center gap-2 mb-2">
								<input
									type="checkbox"
									id="dark-{k}"
									checked={darkEnabled[k] ?? false}
									onchange={() => toggleDark(k)}
									class="w-4 h-4 rounded accent-blue-600"
								/>
								<label for="dark-{k}" class="text-sm font-medium text-gray-700">
									{COLOR_LABELS[k] ?? k}
								</label>
							</div>
							{#if darkEnabled[k]}
								<div class="pl-6">
									<OklchPicker
										value={colorsDark[k] ?? colors[k] ?? 'oklch(0.5 0.15 250)'}
										onUpdate={(v) => setDark(k, v)}
									/>
								</div>
							{/if}
						</div>
					{/each}
				</div>

			<!-- ── Tipografía ── -->
			{:else if activeTab === 'typography'}
				<div class="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-3">Display</h3>
						<FontSpecEditor
							value={typography.display}
							onUpdate={(v) => { typography = { ...typography, display: v }; }}
						/>
					</div>
					<hr class="border-gray-100" />
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-3">Body</h3>
						<FontSpecEditor
							value={typography.body}
							onUpdate={(v) => { typography = { ...typography, body: v }; }}
						/>
					</div>
					<hr class="border-gray-100" />
					<div>
						<div class="flex items-center gap-2 mb-3">
							<input
								type="checkbox"
								id="mono-enabled"
								checked={monoEnabled}
								onchange={() => {
									monoEnabled = !monoEnabled;
									if (monoEnabled && !typography.mono) {
										typography = { ...typography, mono: { ...DEFAULT_FONT, family: 'JetBrains Mono' } };
									}
								}}
								class="w-4 h-4 accent-blue-600"
							/>
							<label for="mono-enabled" class="text-sm font-semibold text-gray-800">Mono (opcional)</label>
						</div>
						{#if monoEnabled}
							<FontSpecEditor
								value={typography.mono ?? { ...DEFAULT_FONT, family: 'JetBrains Mono' }}
								onUpdate={(v) => { typography = { ...typography, mono: v }; }}
							/>
						{/if}
					</div>
					<hr class="border-gray-100" />
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-3">Escala tipográfica</h3>
						<div class="grid grid-cols-3 gap-4">
							{#each TYPO_SCALE as [key, lbl, placeholder] (key)}
								<div>
									<label for="typo-{key}" class="block text-xs text-gray-600 mb-1">{lbl}</label>
									<input
										id="typo-{key}"
										type="text"
										value={String((typography as Record<string, unknown>)[key] ?? placeholder)}
										oninput={(e) => setTypoField(key, (e.target as HTMLInputElement).value)}
										{placeholder}
										class="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm font-mono"
									/>
								</div>
							{/each}
						</div>
					</div>
				</div>

			<!-- ── Tokens ── -->
			{:else if activeTab === 'tokens'}
				<div class="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-3">Border radius</h3>
						<div class="grid grid-cols-3 gap-3">
							{#each RADII_KEYS as k (k)}
								<div>
									<label for="radii-{k}" class="block text-xs text-gray-600 mb-1">{k}</label>
									<input
										id="radii-{k}"
										type="text"
										value={radii[k] ?? ''}
										oninput={(e) => { radii = { ...radii, [k]: (e.target as HTMLInputElement).value }; }}
										class="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm font-mono"
									/>
								</div>
							{/each}
						</div>
					</div>
					<hr class="border-gray-100" />
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-3">Sombras</h3>
						<div class="space-y-3">
							{#each SHADOW_KEYS as k (k)}
								<div>
									<label for="shadow-{k}" class="block text-xs text-gray-600 mb-1">{k}</label>
									<input
										id="shadow-{k}"
										type="text"
										value={shadows[k] ?? ''}
										oninput={(e) => { shadows = { ...shadows, [k]: (e.target as HTMLInputElement).value }; }}
										class="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm font-mono"
									/>
								</div>
							{/each}
						</div>
					</div>
					<hr class="border-gray-100" />
					<div class="grid grid-cols-2 gap-6">
						<div>
							<h3 class="text-sm font-semibold text-gray-800 mb-3">Espaciado</h3>
							<label for="spacing-scale" class="block text-xs text-gray-600 mb-1">Escala multiplicadora</label>
							<input
								id="spacing-scale"
								type="number" min="0.5" max="2" step="0.05"
								value={spacing.scale ?? 1}
								oninput={(e) => { spacing = { scale: parseFloat((e.target as HTMLInputElement).value) }; }}
								class="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
							/>
						</div>
						<div>
							<h3 class="text-sm font-semibold text-gray-800 mb-3">Layout</h3>
							<div class="space-y-3">
								<div>
									<label for="layout-content" class="block text-xs text-gray-600 mb-1">Ancho máximo contenido</label>
									<input
										id="layout-content"
										type="text"
										value={layout.max_width_content ?? ''}
										oninput={(e) => { layout = { ...layout, max_width_content: (e.target as HTMLInputElement).value }; }}
										class="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm font-mono"
									/>
								</div>
								<div>
									<label for="layout-prose" class="block text-xs text-gray-600 mb-1">Ancho máximo prosa</label>
									<input
										id="layout-prose"
										type="text"
										value={layout.max_width_prose ?? ''}
										oninput={(e) => { layout = { ...layout, max_width_prose: (e.target as HTMLInputElement).value }; }}
										class="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm font-mono"
									/>
								</div>
							</div>
						</div>
					</div>
				</div>

			<!-- ── Legal ── -->
			{:else if activeTab === 'legal'}
				<div class="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
					<div>
						<label for="legal-address" class="block text-sm font-medium text-gray-700 mb-1">Dirección / pie de página</label>
						<textarea
							id="legal-address"
							rows="3"
							value={legalAddress}
							oninput={(e) => { legalAddress = (e.target as HTMLTextAreaElement).value; }}
							placeholder="Empresa S.A. · Calle Ejemplo 123 · Ciudad, País"
							class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-y"
						></textarea>
					</div>
					<div>
						<div class="flex items-center justify-between mb-2">
							<span class="text-sm font-medium text-gray-700">Enlaces legales</span>
							<button type="button" onclick={addLegalLink} class="text-xs text-blue-600 hover:text-blue-800">
								+ Añadir enlace
							</button>
						</div>
						{#each legalLinks as link, i (i)}
							<div class="flex gap-2 items-center mb-2">
								<input
									type="text"
									value={link.label}
									oninput={(e) => updateLegalLink(i, 'label', (e.target as HTMLInputElement).value)}
									placeholder="Aviso Legal"
									class="w-36 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
								/>
								<input
									type="url"
									value={link.href}
									oninput={(e) => updateLegalLink(i, 'href', (e.target as HTMLInputElement).value)}
									placeholder="https://..."
									class="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm font-mono"
								/>
								<button type="button" onclick={() => removeLegalLink(i)} class="text-gray-400 hover:text-red-500 px-1">
									✕
								</button>
							</div>
						{/each}
						{#if !legalLinks.length}
							<p class="text-xs text-gray-400">Sin enlaces legales configurados.</p>
						{/if}
					</div>
				</div>

			<!-- ── CSS custom ── -->
			{:else if activeTab === 'css'}
				<div class="bg-white border border-gray-200 rounded-lg p-6">
					<label for="custom-css" class="block text-sm font-medium text-gray-700 mb-2">
						CSS personalizado
						<span class="ml-1 font-normal text-gray-400 text-xs">(se inyecta en &lt;head&gt;)</span>
					</label>
					<textarea
						id="custom-css"
						rows="18"
						value={customCss}
						oninput={(e) => { customCss = (e.target as HTMLTextAreaElement).value; }}
						placeholder="/* Variables adicionales, overrides de componentes... */"
						class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono resize-y"
						spellcheck="false"
					></textarea>
				</div>
			{/if}

		</div>

		<!-- ── Preview iframe ── -->
		<div class="w-80 xl:w-96 flex-shrink-0 sticky top-4">
			<div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
				<div class="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50">
					<span class="text-xs font-medium text-gray-600">
						Preview{hasDraft ? ' · borrador' : ''}
					</span>
					<button
						type="button"
						onclick={() => iframeKey++}
						class="text-xs text-gray-400 hover:text-gray-700"
						title="Recargar"
					>↺</button>
				</div>
				{#if data.previewUrl}
					<iframe
						src="{data.previewUrl}/brand-preview?draft=1&_k={iframeKey}"
						title="Brand preview"
						class="w-full h-[600px] xl:h-[700px] border-0"
						loading="lazy"
					></iframe>
				{:else}
					<div class="flex items-center justify-center h-48 text-sm text-gray-400 text-center px-4">
						Configura un dominio activo para ver el preview en tiempo real.
					</div>
				{/if}
			</div>
		</div>

	</div>
</div>
