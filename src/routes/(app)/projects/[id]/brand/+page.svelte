<script lang="ts">
	import { untrack }       from 'svelte';
	import { enhance }       from '$app/forms';
	import { goto }          from '$app/navigation';
	import { toast }         from '$lib/toast.svelte';
	import HexColorPicker    from '$lib/components/HexColorPicker.svelte';
	import FontSpecEditor    from '$lib/components/FontSpecEditor.svelte';
	import BrandPreview      from '$lib/components/BrandPreview.svelte';
	import ConfirmDialog     from '$lib/components/ConfirmDialog.svelte';
	import Button            from '$lib/components/Button.svelte';
	import BrandLegalForm    from '$lib/components/BrandLegalForm.svelte';
	import type { FontSpec, LegalDraft } from '$lib/types';
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
	let legalInfo = $state<LegalDraft>(untrack(() => ({
		address:       s?.legal_info?.address       ?? '',
		legal_name:    s?.legal_info?.legal_name    ?? '',
		tax_id:        s?.legal_info?.tax_id        ?? '',
		business_type: s?.legal_info?.business_type ?? '',
		postal_code:   s?.legal_info?.postal_code   ?? '',
		city:          s?.legal_info?.city          ?? '',
		state:         s?.legal_info?.state         ?? '',
		country:       s?.legal_info?.country       ?? '',
		email:         s?.legal_info?.email         ?? '',
		phone:         s?.legal_info?.phone         ?? '',
		legalLinks:    (s?.legal_info?.legalLinks ?? []).map(l => ({ ...l })),
	})));

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
			address:       legalInfo.address       || undefined,
			legal_name:    legalInfo.legal_name    || undefined,
			tax_id:        legalInfo.tax_id        || undefined,
			business_type: legalInfo.business_type || undefined,
			postal_code:   legalInfo.postal_code   || undefined,
			city:          legalInfo.city          || undefined,
			state:         legalInfo.state         || undefined,
			country:       legalInfo.country       || undefined,
			email:         legalInfo.email         || undefined,
			phone:         legalInfo.phone         || undefined,
			legalLinks:    legalInfo.legalLinks.length ? legalInfo.legalLinks : undefined,
		},
		custom_css: customCss || null,
	}));

	// ─── UI state ──────────────────────────────────────────────────────────────

	let activeTab:   Tab    = $state('colors');
	let iframeKey           = $state(0);
	let hasDraft            = $state(
		untrack(() => data.manual?.draft_overrides !== null && data.manual?.draft_overrides !== undefined)
	);
	let savingDraft      = $state(false);
	let publishing       = $state(false);
	let confirmOpen      = $state(false);

	let draftFormEl      = $state<HTMLFormElement | undefined>();
	let publishFormEl    = $state<HTMLFormElement | undefined>();

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
	<div class="flex items-center gap-2 text-sm text-subtle flex-wrap">
		<a href="/dashboard" class="hover:text-ink">Proyectos</a>
		<span>/</span>
		<a href="/projects/{data.project.id}" class="hover:text-ink">{data.project.name}</a>
		<span>/</span>
		<span class="text-ink font-medium">Marca</span>
	</div>

	<!-- Título + badge + botones -->
	<div class="flex items-center justify-between flex-wrap gap-3">
		<div class="flex items-center gap-3">
			<h1 class="text-xl font-semibold text-ink">Manual de marca</h1>
			{#if hasDraft}
				<span class="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-warning-hover">
					BORRADOR
				</span>
			{/if}
			{#if data.manual?.version}
				<span class="text-xs text-faint">v{data.manual.version}</span>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<Button
				variant="secondary"
				onclick={() => draftFormEl?.requestSubmit()}
				loading={savingDraft}
			>
				Guardar borrador
			</Button>
			<Button onclick={openConfirm} loading={publishing} loadingLabel="Publicando…">
				Publicar
			</Button>
		</div>
	</div>

	{#if !data.manual}
		<div class="bg-amber-50 border border-amber-200 rounded-md p-4 text-sm text-warning-hover">
			Este proyecto no tiene un manual de marca aún. Completa los campos y haz clic en <strong>Publicar</strong> para crearlo.
		</div>
	{/if}

	<!-- Layout: editor + preview -->
	<div class="flex gap-6 items-start">

		<!-- ── Editor ── -->
		<div class="flex-1 min-w-0 space-y-4">

			<!-- Tabs -->
			<div class="flex gap-1 border-b border-border-subtle overflow-x-auto">
				{#each TABS as [tabId, tabLabel] (tabId)}
					<button
						type="button"
						onclick={() => { activeTab = tabId; }}
						class="px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors
							{activeTab === tabId
								? 'border-primary text-primary'
								: 'border-transparent text-subtle hover:text-body'}"
					>
						{tabLabel}
					</button>
				{/each}
			</div>

			<!-- ── Colores ── -->
			{#if activeTab === 'colors'}
				<div class="bg-white border border-border-subtle rounded-lg p-6 space-y-5">
					{#each COLOR_KEYS as k (k)}
						<div>
							<p class="text-sm font-medium text-body mb-2">{COLOR_LABELS[k] ?? k}</p>
							<HexColorPicker
								value={colors[k] ?? DEFAULT_COLORS[k] ?? 'oklch(0.5 0.15 250)'}
								onUpdate={(v) => { colors = { ...colors, [k]: v }; }}
							/>
						</div>
					{/each}
				</div>

			<!-- ── Dark mode ── -->
			{:else if activeTab === 'dark'}
				<div class="bg-white border border-border-subtle rounded-lg p-6 space-y-5">
					<p class="text-sm text-subtle">
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
								<label for="dark-{k}" class="text-sm font-medium text-body">
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
				<div class="bg-white border border-border-subtle rounded-lg p-6 space-y-6">
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-3">Fuente de títulos (Display)</h3>
						<FontSpecEditor
							value={typography.display}
							onUpdate={(v) => { typography = { ...typography, display: v }; }}
						/>
					</div>
					<hr class="border-border-faint" />
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-3">Fuente de cuerpo (Body)</h3>
						<FontSpecEditor
							value={typography.body}
							onUpdate={(v) => { typography = { ...typography, body: v }; }}
						/>
					</div>
					<hr class="border-border-faint" />
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
					<hr class="border-border-faint" />
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-4">Escala tipográfica</h3>
						<div class="grid grid-cols-2 gap-5">
							<div>
								<label for="typo-size-base" class="block text-xs text-muted mb-1">Tamaño base de texto</label>
								<div class="flex items-center gap-2">
									<input
										id="typo-size-base"
										type="number"
										min="12" max="24" step="1"
										value={sizeBasePx}
										oninput={(e) => { sizeBasePx = parseInt((e.target as HTMLInputElement).value) || 16; }}
										class="w-20 border border-border rounded-md px-2 py-1.5 text-sm"
									/>
									<span class="text-sm text-subtle">px</span>
								</div>
								<p class="text-xs text-faint mt-1">Recomendado: 16 px</p>
							</div>
							<div>
								<label for="typo-line-height" class="block text-xs text-muted mb-1">Interlineado</label>
								<div class="flex items-center gap-2">
									<input
										id="typo-line-height"
										type="number"
										min="1" max="3" step="0.05"
										value={lineHeight}
										oninput={(e) => { lineHeight = parseFloat((e.target as HTMLInputElement).value) || 1.5; }}
										class="w-20 border border-border rounded-md px-2 py-1.5 text-sm"
									/>
									<span class="text-sm text-subtle">× tamaño</span>
								</div>
								<p class="text-xs text-faint mt-1">Recomendado: 1.5</p>
							</div>
							<div class="col-span-2">
								<label for="typo-tracking" class="block text-xs text-muted mb-1">
									Espaciado entre letras (tracking)
									<span class="font-normal text-faint">— {trackingEm >= 0 ? '+' : ''}{trackingEm.toFixed(3)}em</span>
								</label>
								<div class="flex items-center gap-3">
									<span class="text-xs text-faint whitespace-nowrap">Apretado</span>
									<input
										id="typo-tracking"
										type="range"
										min="-0.05" max="0.15" step="0.005"
										value={trackingEm}
										oninput={(e) => { trackingEm = parseFloat((e.target as HTMLInputElement).value); }}
										class="flex-1 accent-blue-600"
									/>
									<span class="text-xs text-faint whitespace-nowrap">Espaciado</span>
								</div>
							</div>
						</div>
					</div>
				</div>

			<!-- ── Tokens ── -->
			{:else if activeTab === 'tokens'}
				<div class="bg-white border border-border-subtle rounded-lg p-6 space-y-8">

					<!-- Border radius -->
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-1">Redondeo de esquinas</h3>
						<p class="text-xs text-subtle mb-4">Define el estilo visual de los elementos del sitio.</p>
						<div class="flex gap-3 flex-wrap">
							{#each RADII_PRESETS as p (p.id)}
								<button
									type="button"
									onclick={() => applyRadiiPreset(p.id)}
									class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors
										{activeRadiiPreset === p.id
											? 'border-primary bg-blue-50'
											: 'border-border-subtle hover:border-border bg-white'}"
								>
									<div
										class="w-10 h-10 border-2 bg-surface-muted-strong
											{activeRadiiPreset === p.id ? 'border-blue-500' : 'border-faint'}"
										style="border-radius: {p.values.md};"
									></div>
									<span class="text-xs font-medium {activeRadiiPreset === p.id ? 'text-primary-hover' : 'text-muted'}">
										{p.label}
									</span>
								</button>
							{/each}
						</div>
					</div>

					<hr class="border-border-faint" />

					<!-- Sombras -->
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-1">Sombras</h3>
						<p class="text-xs text-subtle mb-4">Intensidad de la profundidad visual en tarjetas y modales.</p>
						<div class="flex gap-3 flex-wrap">
							{#each SHADOW_PRESETS as p (p.id)}
								<button
									type="button"
									onclick={() => applyShadowPreset(p.id)}
									class="flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-colors
										{activeShadowPreset === p.id
											? 'border-primary bg-blue-50'
											: 'border-border-subtle hover:border-border bg-white'}"
								>
									<div
										class="w-12 h-10 bg-white rounded-md
											{activeShadowPreset === p.id ? 'border border-blue-100' : 'border border-border-faint'}"
										style="box-shadow: {p.values.md !== 'none' ? p.values.md : 'none'};"
									></div>
									<span class="text-xs font-medium {activeShadowPreset === p.id ? 'text-primary-hover' : 'text-muted'}">
										{p.label}
									</span>
								</button>
							{/each}
						</div>
					</div>

					<hr class="border-border-faint" />

					<!-- Layout -->
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-4">Ancho máximo del contenido</h3>
						<div class="grid grid-cols-2 gap-5">
							<div>
								<label for="layout-content" class="block text-xs text-muted mb-1">Contenido general</label>
								<div class="flex items-center gap-2">
									<input
										id="layout-content"
										type="number"
										min="800" max="2000" step="40"
										value={layoutContentPx}
										oninput={(e) => { layoutContentPx = parseInt((e.target as HTMLInputElement).value) || 1280; }}
										class="w-24 border border-border rounded-md px-2 py-1.5 text-sm"
									/>
									<span class="text-sm text-subtle">px</span>
								</div>
								<p class="text-xs text-faint mt-1">Recomendado: 1280 px</p>
							</div>
							<div>
								<label for="layout-prose" class="block text-xs text-muted mb-1">Texto largo / artículos</label>
								<div class="flex items-center gap-2">
									<input
										id="layout-prose"
										type="number"
										min="400" max="1200" step="20"
										value={layoutProsePx}
										oninput={(e) => { layoutProsePx = parseInt((e.target as HTMLInputElement).value) || 720; }}
										class="w-24 border border-border rounded-md px-2 py-1.5 text-sm"
									/>
									<span class="text-sm text-subtle">px</span>
								</div>
								<p class="text-xs text-faint mt-1">Recomendado: 720 px</p>
							</div>
						</div>
					</div>

					<hr class="border-border-faint" />

					<!-- Espaciado -->
					<div>
						<h3 class="text-sm font-semibold text-gray-800 mb-1">Espaciado general</h3>
						<p class="text-xs text-subtle mb-3">Multiplica el espaciado base del sitio. 1 = normal.</p>
						<div class="flex items-center gap-3">
							<span class="text-xs text-faint whitespace-nowrap">Compacto (0.75)</span>
							<input
								id="spacing-scale"
								type="range"
								min="0.75" max="1.5" step="0.05"
								value={spacing.scale ?? 1}
								oninput={(e) => { spacing = { scale: parseFloat((e.target as HTMLInputElement).value) }; }}
								class="flex-1 accent-blue-600"
							/>
							<span class="text-xs text-faint whitespace-nowrap">Espacioso (1.5)</span>
						</div>
						<p class="text-xs text-subtle mt-2 text-center">
							Valor actual: <strong>{(spacing.scale ?? 1).toFixed(2)}×</strong>
						</p>
					</div>

				</div>

			<!-- ── Legal ── -->
			{:else if activeTab === 'legal'}
				<BrandLegalForm
					address={legalInfo.address}
					legalName={legalInfo.legal_name}
					taxId={legalInfo.tax_id}
					businessType={legalInfo.business_type}
					postalCode={legalInfo.postal_code}
					city={legalInfo.city}
					region={legalInfo.state}
					country={legalInfo.country}
					email={legalInfo.email}
					phone={legalInfo.phone}
					legalLinks={legalInfo.legalLinks}
					action="?/generateLegalPages"
					onUpdate={(v) => { legalInfo = v; }}
				/>

			<!-- ── CSS custom ── -->
			{:else if activeTab === 'css'}
				<div class="bg-white border border-border-subtle rounded-lg p-6">
					<label for="custom-css" class="block text-sm font-medium text-body mb-2">
						CSS personalizado
						<span class="ml-1 font-normal text-faint text-xs">(se inyecta en &lt;head&gt;)</span>
					</label>
					<textarea
						id="custom-css"
						rows="18"
						value={customCss}
						oninput={(e) => { customCss = (e.target as HTMLTextAreaElement).value; }}
						placeholder="/* Variables adicionales, overrides de componentes... */"
						class="w-full border border-border rounded-md px-3 py-2 text-sm font-mono resize-y"
						spellcheck="false"
					></textarea>
				</div>
			{/if}

		</div>

		<!-- ── Preview panel ── -->
		<div class="w-80 xl:w-96 flex-shrink-0 sticky top-4 flex flex-col" style="max-height: calc(100vh - 2rem);">
			<div class="bg-white border border-border-subtle rounded-lg overflow-hidden flex flex-col min-h-0 flex-1">
				<!-- Barra de título -->
				<div class="flex items-center justify-between px-3 py-2 border-b border-border-faint bg-surface-muted flex-shrink-0">
					<span class="text-xs font-medium text-muted">
						Vista previa{hasDraft ? ' · borrador' : ''}
					</span>
					{#if data.previewUrl}
						<button
							type="button"
							onclick={() => iframeKey++}
							class="text-xs text-faint hover:text-body"
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
						<div class="px-4 py-3 bg-surface-muted border-t border-border-faint flex-shrink-0">
							<p class="text-xs text-faint text-center">
								Configura un dominio activo para ver el preview del sitio completo.
							</p>
						</div>
					</div>
				{/if}
			</div>
		</div>

	</div>
</div>
