<script lang="ts">
	interface FontSpec {
		family:  string;
		weights: number[];
		source:  'google' | 'system' | 'custom';
	}

	interface Props {
		colors:     Record<string, string>;
		typography: { display: FontSpec; body: FontSpec; mono?: FontSpec };
		radii:      Record<string, string>;
		shadows:    Record<string, string>;
	}

	let { colors, typography, radii, shadows }: Props = $props();

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

	const RADII_KEYS   = ['none', 'sm', 'md', 'lg', 'xl', 'full'];
	const SHADOW_KEYS  = ['sm', 'md', 'lg'];

	// Carga Google Fonts dinámicamente al cambiar tipografía
	$effect(() => {
		const specs = [typography.display, typography.body, typography.mono].filter(
			(s): s is FontSpec => s !== undefined && s.source === 'google' && !!s.family,
		);
		specs.forEach((spec) => {
			const id = `gf-preview-${spec.family.replace(/\s+/g, '-').toLowerCase()}`;
			if (!document.getElementById(id)) {
				const link = document.createElement('link');
				link.id   = id;
				link.rel  = 'stylesheet';
				link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(spec.family)}:wght@400;700&display=swap`;
				document.head.appendChild(link);
			}
		});
	});
</script>

<div class="space-y-5 p-4 text-xs">

	<!-- Paleta de colores -->
	<section>
		<p class="text-gray-500 font-medium mb-2 uppercase tracking-wide text-[10px]">Colores</p>
		<div class="grid grid-cols-3 gap-2">
			{#each Object.entries(colors) as [key, val] (key)}
				<div>
					<div
						class="h-7 rounded border border-black/5"
						style="background: {val};"
						title="{val}"
					></div>
					<p class="mt-0.5 text-gray-500 leading-tight" style="font-size:10px;">
						{COLOR_LABELS[key] ?? key}
					</p>
				</div>
			{/each}
		</div>
	</section>

	<hr class="border-gray-100" />

	<!-- Tipografía -->
	<section>
		<p class="text-gray-500 font-medium mb-2 uppercase tracking-wide text-[10px]">Tipografía</p>
		<div class="space-y-3">
			<div>
				<p class="text-gray-400 text-[10px] mb-0.5">Display — {typography.display.family}</p>
				<p
					class="text-gray-900 font-bold leading-tight"
					style="font-family: '{typography.display.family}', sans-serif; font-size: 20px;"
				>
					Aa — Título de ejemplo
				</p>
			</div>
			<div>
				<p class="text-gray-400 text-[10px] mb-0.5">Body — {typography.body.family}</p>
				<p
					class="text-gray-700 leading-normal"
					style="font-family: '{typography.body.family}', sans-serif; font-size: 13px;"
				>
					Texto de cuerpo: Lorem ipsum dolor sit amet, consectetur adipiscing elit.
				</p>
			</div>
			{#if typography.mono}
				<div>
					<p class="text-gray-400 text-[10px] mb-0.5">Mono — {typography.mono.family}</p>
					<p
						class="text-gray-700"
						style="font-family: '{typography.mono.family}', monospace; font-size: 12px;"
					>
						const value = 42;
					</p>
				</div>
			{/if}
		</div>
	</section>

	<hr class="border-gray-100" />

	<!-- Border radius -->
	<section>
		<p class="text-gray-500 font-medium mb-2 uppercase tracking-wide text-[10px]">Border radius</p>
		<div class="flex gap-2 flex-wrap">
			{#each RADII_KEYS as k (k)}
				{@const r = radii[k] ?? '0px'}
				<div class="flex flex-col items-center gap-1">
					<div
						class="w-8 h-8 border-2 border-gray-400 bg-gray-100"
						style="border-radius: {r};"
					></div>
					<span class="text-gray-400" style="font-size:9px;">{k}</span>
				</div>
			{/each}
		</div>
	</section>

	<hr class="border-gray-100" />

	<!-- Sombras -->
	<section>
		<p class="text-gray-500 font-medium mb-2 uppercase tracking-wide text-[10px]">Sombras</p>
		<div class="flex gap-3 flex-wrap">
			{#each SHADOW_KEYS as k (k)}
				{@const sh = shadows[k]}
				{#if sh && sh !== 'none'}
					<div class="flex flex-col items-center gap-1">
						<div
							class="w-10 h-10 bg-white rounded"
							style="box-shadow: {sh};"
						></div>
						<span class="text-gray-400" style="font-size:9px;">{k}</span>
					</div>
				{/if}
			{/each}
		</div>
	</section>

</div>
