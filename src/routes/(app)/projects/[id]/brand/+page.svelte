<script lang="ts">
	import { untrack }       from 'svelte';
	import { enhance }       from '$app/forms';
	import { goto }          from '$app/navigation';
	import { toast }         from '$lib/toast.svelte';
	import HexColorPicker    from '$lib/components/HexColorPicker.svelte';
	import FontSpecEditor    from '$lib/components/FontSpecEditor.svelte';
	import BrandPreview      from '$lib/components/BrandPreview.svelte';
	import ConfirmDialog     from '$lib/components/ConfirmDialog.svelte';
	import type { FontSpec } from '$lib/components/FontSpecEditor.svelte';
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

	const COLOR_KEYS = Object.keys(DEFAULT_COLORS);

	// Presets de border radius
	type RadiiPreset = { id: string; label: string; values: Record<string, string> };
	const RADII_PRESETS: RadiiPreset[] = [
		{ id: 'none',      label: 'Ninguno',     values: { none: '0px',    sm: '0px',    md: '0px',    lg: '0px',    xl: '0px',    full: '0px'    } },
		{ id: 'subtle',    label: 'Sutil',        values: { none: '0px',    sm: '2px',    md: '4px',    lg: '6px',    xl: '8px',    full: '9999px' } },
		{ id: 'moderate',  label: 'Moderado',     values: { none: '0px',    sm: '4px',    md: '6px',    lg: '8px',    xl: '12px',   full: '9999px' } },
		{ id: 'rounded',   label: 'Redondeado',   values: { none: '0px',    sm: '6px',    md: '10px',   lg: '14px',   xl: '20px',   full: '9999px' } },
		{ id: 'pill',      label: 'Píldora',      values: { none: '0px',    sm: '9999px', md: '9999px', lg: '9999px', xl: '9999px', full: '9999px' } },
	];

	// Presets de sombras
	type ShadowPreset = { id: string; label: string; values: Record<string, string> };
	const SHADOW_PRESETS: ShadowPreset[] = [
		{
			id: 'none', label: 'Sin sombra',
			values: { sm: 'none', md: 'none', lg: 'none', xl: 'none' },
		},
		{
			id: 'subtle', label: 'Sutil',
			values: {
				sm: '0 1px 2px oklch(0 0 0 / 0.05)',
				md: '0 2px 4px oklch(0 0 0 / 0.07)',
				lg: '0 4px 8px oklch(0 0 0 / 0.08)',
				xl: '0 8px 16px oklch(0 0 0 / 0.1)',
			},
		},
		{
			id: 'moderate', label: 'Moderada',
			values: {
				sm: '0 1px 2px 0 oklch(0 0 0 / 0.05)',
				md: '0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1)',
				lg: '0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1)',
				xl: '0 20px 25px -5px oklch(0 0 0 / 0.1), 0 8px 10px -6px oklch(0 0 0 / 0.1)',
			},
		},
		{
			id: 'strong', label: 'Pronunciada',
			values: {
				sm: '0 2px 4px oklch(0 0 0 / 0.15)',
				md: '0 4px 12px oklch(0 0 0 / 0.2)',
				lg: '0 8px 24px oklch(0 0 0 / 0.2)',
				xl: '0 16px 40px oklch(0 0 0 / 0.2)',
			},
		},
		{
			id: 'intense', label: 'Fuerte',
			values: {
				sm: '0 4px 6px oklch(0 0 0 / 0.2)',
				md: '0 8px 16px oklch(0 0 0 / 0.25)',
				lg: '0 16px 32px oklch(0 0 0 / 0.25)',
				xl: '0 24px 48px oklch(0 0 0 / 0.3)',
			},
		},
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

	// ─── Helpers de conversión ──────────────────────────────────────────────────

	function parsePx(v: string | undefined, def: number): number {
		if (!v) return def;
		if (v.endsWith('px')) return parseInt(v) || def;
		if (v.endsWith('rem')) return Math.round(parseFloat(v) * 16) || def;
		if (v.endsWith('ch')) return Math.round(parseFloat(v) * 11) || def;
		return parseInt(v) || def;
	}

	function parseEm(v: string | undefined, def: number): number {
		if (!v) return def;
		return parseFloat(v) || def;
	}

	function parseRatio(v: string | undefined, def: number): number {
		if (!v) return def;
		return parseFloat(v) || def;
	}

	function findRadiiPreset(r: Record<string, string>): string | null {
		for (const p of RADII_PRESETS) {
			if (Object.entries(p.values).every(([k, v]) => r[k] === v)) return p.id;
		}
		return null;
	}

	function findShadowPreset(sh: Record<string, string>): string | null {
		for (const p of SHADOW_PRESETS) {
			if (Object.entries(p.values).every(([k, v]) => sh[k] === v)) return p.id;
		}
		return null;
	}

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

	let typography = $state(untrack(() => ({
		display: (s?.typography?.display ?? DEFAULT_FONT) as FontSpec,
		body:    (s?.typography?.body    ?? DEFAULT_FONT) as FontSpec,
		mono:    s?.typography?.mono as FontSpec | undefined,
	})));
	let monoEnabled = $state(!!s?.typography?.mono);

	// Escala tipográfica como valores numéricos
	let sizeBasePx  = $state(parsePx(s?.typography?.size_base,   16));
	let lineHeight  = $state(parseRatio(s?.typography?.line_height, 1.5));
	let trackingEm  = $state(parseEm(s?.typography?.tracking,    0));

	// Radii con presets
	const initRadii: Record<string, string> = {
		none: '0px', sm: '0.25rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem', full: '9999px',
		...(s?.radii ?? {}),
	};
	// Normalizar a px si vienen en rem (para que el matching de presets funcione)
	function normRadii(r: Record<string, string>): Record<string, string> {
		const remToPx: Record<string, string> = {
			'0.25rem': '4px', '0.375rem': '6px', '0.5rem': '8px', '0.625rem': '10px',
			'0.75rem': '12px', '1rem': '16px',
		};
		return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, remToPx[v] ?? v]));
	}
	let radii     = $state<Record<string, string>>(untrack(() => normRadii(initRadii)));
	let activeRadiiPreset = $state<string | null>(
		untrack(() => findRadiiPreset(normRadii(initRadii)))
	);

	const initShadows: Record<string, string> = {
		sm: '0 1px 2px 0 oklch(0 0 0 / 0.05)',
		md: '0 4px 6px -1px oklch(0 0 0 / 0.1), 0 2px 4px -2px oklch(0 0 0 / 0.1)',
		lg: '0 10px 15px -3px oklch(0 0 0 / 0.1), 0 4px 6px -4px oklch(0 0 0 / 0.1)',
		xl: '0 20px 25px -5px oklch(0 0 0 / 0.1), 0 8px 10px -6px oklch(0 0 0 / 0.1)',
		...(s?.shadows ?? {}),
	};
	let shadows     = $state<Record<string, string>>(untrack(() => initShadows));
	let activeShadowPreset = $state<string | null>(
		untrack(() => findShadowPreset(initShadows))
	);

	let spacing  = $state({ scale: s?.spacing?.scale ?? 1 });
	let layoutContentPx = $state(parsePx(s?.layout?.max_width_content, 1280));
	let layoutProsePx   = $state(parsePx(s?.layout?.max_width_prose,    720));

	// Legal
	let legalAddress      = $state(s?.legal_info?.address       ?? '');
	let legalName         = $state(s?.legal_info?.legal_name    ?? '');
	let legalTaxId        = $state(s?.legal_info?.tax_id        ?? '');
	let legalBusinessType = $state(s?.legal_info?.business_type ?? '');
	let legalPostalCode   = $state(s?.legal_info?.postal_code   ?? '');
	let legalCity         = $state(s?.legal_info?.city          ?? '');
	let legalState        = $state(s?.legal_info?.state         ?? '');
	let legalCountry      = $state(s?.legal_info?.country       ?? '');
	let legalEmail        = $state(s?.legal_info?.email         ?? '');
	let legalPhone        = $state(s?.legal_info?.phone         ?? '');
	let legalLinks        = $state<{ label: string; href: string }[]>(
		untrack(() => (s?.legal_info?.legalLinks ?? []).map(l => ({ ...l })))
	);

	let customCss = $state(s?.custom_css ?? '');

	// ─── Serialización ─────────────────────────────────────────────────────────

	let draftJson = $derived(JSON.stringify({
		colors,
		colors_dark: Object.fromEntries(
			Object.entries(colorsDark).filter(([k]) => darkEnabled[k])
		),
		typography: {
			display:     typography.display,
			body:        typography.body,
			mono:        monoEnabled ? (typography.mono ?? DEFAULT_FONT) : undefined,
			size_base:   `${sizeBasePx}px`,
			line_height: lineHeight.toFixed(2),
			tracking:    `${trackingEm.toFixed(4)}em`,
		},
		radii,
		shadows,
		spacing,
		layout: {
			max_width_content: `${layoutContentPx}px`,
			max_width_prose:   `${layoutProsePx}px`,
		},
		legal_info: {
			address:       legalAddress       || undefined,
			legal_name:    legalName          || undefined,
			tax_id:        legalTaxId         || undefined,
			business_type: legalBusinessType  || undefined,
			postal_code:   legalPostalCode    || undefined,
			city:          legalCity          || undefined,
			state:         legalState         || undefined,
			country:       legalCountry       || undefined,
			email:         legalEmail         || undefined,
			phone:         legalPhone         || undefined,
			legalLinks:    legalLinks.length ? legalLinks : undefined,
		},
		custom_css: customCss || null,
	}));

	// ─── UI state ──────────────────────────────────────────────────────────────

	let activeTab:   Tab    = $state('colors');
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

	// ─── Helpers colores dark ──────────────────────────────────────────────────

	function toggleDark(k: string) {
		darkEnabled = { ...darkEnabled, [k]: !darkEnabled[k] };
		if (darkEnabled[k] && !(k in colorsDark)) {
			colorsDark = { ...colorsDark, [k]: colors[k] ?? DEFAULT_COLORS[k] ?? 'oklch(0.5 0.15 250)' };
		}
	}
	function setDark(k: string, v: string) {
		colorsDark = { ...colorsDark, [k]: v };
	}

	// ─── Helpers presets ───────────────────────────────────────────────────────

	function applyRadiiPreset(presetId: string) {
		const preset = RADII_PRESETS.find(p => p.id === presetId);
		if (preset) { radii = { ...preset.values }; activeRadiiPreset = presetId; }
	}

	function applyShadowPreset(presetId: string) {
		const preset = SHADOW_PRESETS.find(p => p.id === presetId);
		if (preset) { shadows = { ...preset.values }; activeShadowPreset = presetId; }
	}

	// ─── Helpers legal links ──────────────────────────────────────────────────

	function addLegalLink()          { legalLinks = [...legalLinks, { label: '', href: '' }]; }
	function removeLegalLink(i: number) { legalLinks = legalLinks.filter((_, idx) => idx !== i); }
	function updateLegalLink(i: number, field: 'label' | 'href', val: string) {
		legalLinks = legalLinks.map((l, idx) => idx === i ? { ...l, [field]: val } : l);
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
							<HexColorPicker
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
									<HexColorPicker
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
						<h3 class="text-sm font-semibold text-gray-800 mb-3">Fuente de títulos (Display)</h3>
						<FontSpecEditor
							value={typography.display}
							onUpdate={(v) => { typography = { ...typography, display: v }; }}
						/>
					</div>
					<hr class="border-gray-100" />
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-3">Fuente de cuerpo (Body)</h3>
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
										typography = { ...typography, mono: { family: 'JetBrains Mono', weights: [400, 700], source: 'google' } };
									}
								}}
								class="w-4 h-4 accent-blue-600"
							/>
							<label for="mono-enabled" class="text-sm font-semibold text-gray-800">Fuente monoespaciada (opcional)</label>
						</div>
						{#if monoEnabled}
							<FontSpecEditor
								value={typography.mono ?? { family: 'JetBrains Mono', weights: [400, 700], source: 'google' }}
								onUpdate={(v) => { typography = { ...typography, mono: v }; }}
							/>
						{/if}
					</div>
					<hr class="border-gray-100" />
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-4">Escala tipográfica</h3>
						<div class="grid grid-cols-2 gap-5">
							<div>
								<label for="typo-size-base" class="block text-xs text-gray-600 mb-1">Tamaño base de texto</label>
								<div class="flex items-center gap-2">
									<input
										id="typo-size-base"
										type="number"
										min="12" max="24" step="1"
										value={sizeBasePx}
										oninput={(e) => { sizeBasePx = parseInt((e.target as HTMLInputElement).value) || 16; }}
										class="w-20 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
									/>
									<span class="text-sm text-gray-500">px</span>
								</div>
								<p class="text-xs text-gray-400 mt-1">Recomendado: 16 px</p>
							</div>
							<div>
								<label for="typo-line-height" class="block text-xs text-gray-600 mb-1">Interlineado</label>
								<div class="flex items-center gap-2">
									<input
										id="typo-line-height"
										type="number"
										min="1" max="3" step="0.05"
										value={lineHeight}
										oninput={(e) => { lineHeight = parseFloat((e.target as HTMLInputElement).value) || 1.5; }}
										class="w-20 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
									/>
									<span class="text-sm text-gray-500">× tamaño</span>
								</div>
								<p class="text-xs text-gray-400 mt-1">Recomendado: 1.5</p>
							</div>
							<div class="col-span-2">
								<label for="typo-tracking" class="block text-xs text-gray-600 mb-1">
									Espaciado entre letras (tracking)
									<span class="font-normal text-gray-400">— {trackingEm >= 0 ? '+' : ''}{trackingEm.toFixed(3)}em</span>
								</label>
								<div class="flex items-center gap-3">
									<span class="text-xs text-gray-400 whitespace-nowrap">Apretado</span>
									<input
										id="typo-tracking"
										type="range"
										min="-0.05" max="0.15" step="0.005"
										value={trackingEm}
										oninput={(e) => { trackingEm = parseFloat((e.target as HTMLInputElement).value); }}
										class="flex-1 accent-blue-600"
									/>
									<span class="text-xs text-gray-400 whitespace-nowrap">Espaciado</span>
								</div>
							</div>
						</div>
					</div>
				</div>

			<!-- ── Tokens ── -->
			{:else if activeTab === 'tokens'}
				<div class="bg-white border border-gray-200 rounded-lg p-6 space-y-8">

					<!-- Border radius -->
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-1">Redondeo de esquinas</h3>
						<p class="text-xs text-gray-500 mb-4">Define el estilo visual de los elementos del sitio.</p>
						<div class="flex gap-3 flex-wrap">
							{#each RADII_PRESETS as p (p.id)}
								<button
									type="button"
									onclick={() => applyRadiiPreset(p.id)}
									class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors
										{activeRadiiPreset === p.id
											? 'border-blue-600 bg-blue-50'
											: 'border-gray-200 hover:border-gray-300 bg-white'}"
								>
									<div
										class="w-10 h-10 border-2 bg-gray-100
											{activeRadiiPreset === p.id ? 'border-blue-500' : 'border-gray-400'}"
										style="border-radius: {p.values.md};"
									></div>
									<span class="text-xs font-medium {activeRadiiPreset === p.id ? 'text-blue-700' : 'text-gray-600'}">
										{p.label}
									</span>
								</button>
							{/each}
						</div>
					</div>

					<hr class="border-gray-100" />

					<!-- Sombras -->
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-1">Sombras</h3>
						<p class="text-xs text-gray-500 mb-4">Intensidad de la profundidad visual en tarjetas y modales.</p>
						<div class="flex gap-3 flex-wrap">
							{#each SHADOW_PRESETS as p (p.id)}
								<button
									type="button"
									onclick={() => applyShadowPreset(p.id)}
									class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors
										{activeShadowPreset === p.id
											? 'border-blue-600 bg-blue-50'
											: 'border-gray-200 hover:border-gray-300 bg-white'}"
								>
									<div
										class="w-12 h-10 bg-white rounded-md
											{activeShadowPreset === p.id ? 'border border-blue-100' : 'border border-gray-100'}"
										style="box-shadow: {p.values.md !== 'none' ? p.values.md : 'none'};"
									></div>
									<span class="text-xs font-medium {activeShadowPreset === p.id ? 'text-blue-700' : 'text-gray-600'}">
										{p.label}
									</span>
								</button>
							{/each}
						</div>
					</div>

					<hr class="border-gray-100" />

					<!-- Layout -->
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-4">Ancho máximo del contenido</h3>
						<div class="grid grid-cols-2 gap-5">
							<div>
								<label for="layout-content" class="block text-xs text-gray-600 mb-1">Contenido general</label>
								<div class="flex items-center gap-2">
									<input
										id="layout-content"
										type="number"
										min="800" max="2000" step="40"
										value={layoutContentPx}
										oninput={(e) => { layoutContentPx = parseInt((e.target as HTMLInputElement).value) || 1280; }}
										class="w-24 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
									/>
									<span class="text-sm text-gray-500">px</span>
								</div>
								<p class="text-xs text-gray-400 mt-1">Recomendado: 1280 px</p>
							</div>
							<div>
								<label for="layout-prose" class="block text-xs text-gray-600 mb-1">Texto largo / artículos</label>
								<div class="flex items-center gap-2">
									<input
										id="layout-prose"
										type="number"
										min="400" max="1200" step="20"
										value={layoutProsePx}
										oninput={(e) => { layoutProsePx = parseInt((e.target as HTMLInputElement).value) || 720; }}
										class="w-24 border border-gray-300 rounded-md px-2 py-1.5 text-sm"
									/>
									<span class="text-sm text-gray-500">px</span>
								</div>
								<p class="text-xs text-gray-400 mt-1">Recomendado: 720 px</p>
							</div>
						</div>
					</div>

					<hr class="border-gray-100" />

					<!-- Espaciado -->
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-1">Espaciado general</h3>
						<p class="text-xs text-gray-500 mb-3">Multiplica el espaciado base del sitio. 1 = normal.</p>
						<div class="flex items-center gap-3">
							<span class="text-xs text-gray-400 whitespace-nowrap">Compacto (0.75)</span>
							<input
								id="spacing-scale"
								type="range"
								min="0.75" max="1.5" step="0.05"
								value={spacing.scale ?? 1}
								oninput={(e) => { spacing = { scale: parseFloat((e.target as HTMLInputElement).value) }; }}
								class="flex-1 accent-blue-600"
							/>
							<span class="text-xs text-gray-400 whitespace-nowrap">Espacioso (1.5)</span>
						</div>
						<p class="text-xs text-gray-500 mt-2 text-center">
							Valor actual: <strong>{(spacing.scale ?? 1).toFixed(2)}×</strong>
						</p>
					</div>

				</div>

			<!-- ── Legal ── -->
			{:else if activeTab === 'legal'}
				<div class="bg-white border border-gray-200 rounded-lg p-6 space-y-5">

					<!-- Identificación fiscal -->
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-4">Datos de la empresa</h3>
						<div class="space-y-4">
							<div>
								<label for="legal-name" class="block text-xs font-medium text-gray-600 mb-1">Nombre legal de la empresa</label>
								<input
									id="legal-name"
									type="text"
									value={legalName}
									oninput={(e) => { legalName = (e.target as HTMLInputElement).value; }}
									placeholder="Mi Empresa S.A. de C.V."
									class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
								/>
							</div>
							<div>
								<label for="legal-business-type" class="block text-xs font-medium text-gray-600 mb-1">Razón social / Giro de negocio</label>
								<input
									id="legal-business-type"
									type="text"
									value={legalBusinessType}
									oninput={(e) => { legalBusinessType = (e.target as HTMLInputElement).value; }}
									placeholder="Servicios de tecnología"
									class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
								/>
							</div>
							<div>
								<label for="legal-tax-id" class="block text-xs font-medium text-gray-600 mb-1">Número de identificación fiscal (RFC / NIT / CIF…)</label>
								<input
									id="legal-tax-id"
									type="text"
									value={legalTaxId}
									oninput={(e) => { legalTaxId = (e.target as HTMLInputElement).value; }}
									placeholder="XAXX010101000"
									class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm font-mono"
								/>
							</div>
						</div>
					</div>

					<hr class="border-gray-100" />

					<!-- Dirección -->
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-4">Dirección</h3>
						<div class="space-y-4">
							<div>
								<label for="legal-address" class="block text-xs font-medium text-gray-600 mb-1">Calle y número</label>
								<textarea
									id="legal-address"
									rows="2"
									value={legalAddress}
									oninput={(e) => { legalAddress = (e.target as HTMLTextAreaElement).value; }}
									placeholder="Av. Ejemplo 123, Col. Centro"
									class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm resize-y"
								></textarea>
							</div>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<label for="legal-postal-code" class="block text-xs font-medium text-gray-600 mb-1">Código postal</label>
									<input
										id="legal-postal-code"
										type="text"
										value={legalPostalCode}
										oninput={(e) => { legalPostalCode = (e.target as HTMLInputElement).value; }}
										placeholder="06600"
										class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
									/>
								</div>
								<div>
									<label for="legal-city" class="block text-xs font-medium text-gray-600 mb-1">Ciudad</label>
									<input
										id="legal-city"
										type="text"
										value={legalCity}
										oninput={(e) => { legalCity = (e.target as HTMLInputElement).value; }}
										placeholder="Ciudad de México"
										class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
									/>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<label for="legal-state" class="block text-xs font-medium text-gray-600 mb-1">Estado / Provincia</label>
									<input
										id="legal-state"
										type="text"
										value={legalState}
										oninput={(e) => { legalState = (e.target as HTMLInputElement).value; }}
										placeholder="CDMX"
										class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
									/>
								</div>
								<div>
									<label for="legal-country" class="block text-xs font-medium text-gray-600 mb-1">País</label>
									<input
										id="legal-country"
										type="text"
										value={legalCountry}
										oninput={(e) => { legalCountry = (e.target as HTMLInputElement).value; }}
										placeholder="México"
										class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
									/>
								</div>
							</div>
						</div>
					</div>

					<hr class="border-gray-100" />

					<!-- Contacto -->
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-4">Contacto</h3>
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="legal-email" class="block text-xs font-medium text-gray-600 mb-1">Correo electrónico</label>
								<input
									id="legal-email"
									type="email"
									value={legalEmail}
									oninput={(e) => { legalEmail = (e.target as HTMLInputElement).value; }}
									placeholder="contacto@empresa.com"
									class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
								/>
							</div>
							<div>
								<label for="legal-phone" class="block text-xs font-medium text-gray-600 mb-1">Teléfono</label>
								<input
									id="legal-phone"
									type="tel"
									value={legalPhone}
									oninput={(e) => { legalPhone = (e.target as HTMLInputElement).value; }}
									placeholder="+52 55 1234 5678"
									class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
								/>
							</div>
						</div>
					</div>

					<hr class="border-gray-100" />

					<!-- Enlaces legales -->
					<div>
						<div class="flex items-center justify-between mb-3">
							<h3 class="text-sm font-semibold text-gray-800">Enlaces legales</h3>
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

		<!-- ── Preview panel ── -->
		<div class="w-80 xl:w-96 flex-shrink-0 sticky top-4 flex flex-col" style="max-height: calc(100vh - 2rem);">
			<div class="bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col min-h-0 flex-1">
				<!-- Barra de título -->
				<div class="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
					<span class="text-xs font-medium text-gray-600">
						Vista previa{hasDraft ? ' · borrador' : ''}
					</span>
					{#if data.previewUrl}
						<button
							type="button"
							onclick={() => iframeKey++}
							class="text-xs text-gray-400 hover:text-gray-700"
							title="Recargar"
						>↺</button>
					{/if}
				</div>
				<!-- Contenido scrollable -->
				{#if data.previewUrl}
					<div class="flex-1 min-h-0">
						<iframe
							src="{data.previewUrl}/brand-preview?draft=1&_k={iframeKey}"
							title="Brand preview"
							class="w-full h-full border-0"
							loading="lazy"
						></iframe>
					</div>
				{:else}
					<div class="flex-1 overflow-y-auto min-h-0 flex flex-col">
						<div class="flex-1">
							<BrandPreview {colors} typography={{ display: typography.display, body: typography.body, mono: monoEnabled ? typography.mono : undefined }} {radii} {shadows} />
						</div>
						<div class="px-4 py-3 bg-gray-50 border-t border-gray-100 flex-shrink-0">
							<p class="text-xs text-gray-400 text-center">
								Configura un dominio activo para ver el preview del sitio completo.
							</p>
						</div>
					</div>
				{/if}
			</div>
		</div>

	</div>
</div>
