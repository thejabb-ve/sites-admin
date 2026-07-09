<script lang="ts">
	import { untrack } from 'svelte';

	export interface FontSpec {
		family:  string;
		weights: number[];
		source:  'google' | 'system' | 'custom';
		urls?:   { weight: number; style?: string; url: string }[];
	}

	interface Props {
		value:    FontSpec;
		onUpdate: (v: FontSpec) => void;
	}

	let { value, onUpdate }: Props = $props();

	// ─── Fuentes disponibles ──────────────────────────────────────────────────

	const GOOGLE_FONTS = [
		// Sans-serif populares
		'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Oswald', 'Raleway',
		'Ubuntu', 'Nunito', 'DM Sans', 'Work Sans', 'Rubik', 'Mulish', 'Karla', 'Manrope',
		'Outfit', 'Quicksand', 'Cabin', 'Heebo', 'Barlow', 'Figtree', 'Plus Jakarta Sans',
		'Space Grotesk', 'Sora', 'Jost', 'Urbanist', 'Josefin Sans', 'Exo 2', 'Nunito Sans',
		'Assistant', 'Varela Round', 'Comfortaa', 'Questrial', 'Fira Sans', 'Hind',
		'Titillium Web', 'Cairo', 'Tajawal', 'Chivo', 'Lexend', 'Hanken Grotesk',
		'Instrument Sans', 'Albert Sans', 'Bricolage Grotesque', 'Asap',
		// Serif
		'Playfair Display', 'Merriweather', 'Lora', 'EB Garamond', 'Libre Baskerville',
		'PT Serif', 'Arvo', 'Bitter', 'Vollkorn', 'Crimson Text', 'Source Serif 4',
		'Spectral', 'Alegreya', 'Bodoni Moda', 'DM Serif Display', 'Cormorant Garamond',
		'Cormorant', 'Cardo', 'Neuton', 'Libre Caslon Text', 'Cinzel',
		// Display / decorativas
		'Bebas Neue', 'Anton', 'Abril Fatface', 'Righteous', 'Bungee', 'Alfa Slab One',
		'Fredoka One', 'Pacifico', 'Lobster', 'Lobster Two', 'Permanent Marker',
		'Amatic SC', 'Yeseva One', 'Rokkitt', 'Philosopher',
		// Script
		'Dancing Script', 'Caveat', 'Sacramento', 'Great Vibes', 'Indie Flower',
		'Satisfy', 'Courgette', 'Kalam', 'Patrick Hand', 'Grandstander',
		// Monoespaciadas
		'JetBrains Mono', 'Fira Code', 'Source Code Pro', 'Roboto Mono', 'Space Mono',
		'IBM Plex Mono', 'Inconsolata', 'Courier Prime',
		// Multilingüe
		'Noto Sans', 'Noto Serif', 'Kanit', 'Sarabun', 'Prompt', 'Mitr',
	].sort();

	const SYSTEM_FONTS = [
		'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Arial',
		'Helvetica Neue', 'Georgia', 'Times New Roman', 'Verdana', 'Trebuchet MS',
		'Impact', 'Lucida Console', 'Courier New',
	];

	// ID único para los datalists (evita colisiones si hay varios FontSpecEditor en la página)
	const uid = Math.random().toString(36).slice(2, 7);

	// ─── Estado ───────────────────────────────────────────────────────────────

	let family      = $state(untrack(() => value.family));
	let source      = $state<'google' | 'system' | 'custom'>(untrack(() => value.source));
	let weightsText = $state(untrack(() => (value.weights ?? [400]).join('\n')));
	let urls        = $state<{ weight: number; style: string; url: string }[]>(
		untrack(() => (value.urls ?? []).map(u => ({ weight: u.weight, style: u.style ?? '', url: u.url })))
	);

	function emit() {
		const weights = weightsText
			.split('\n')
			.map(s => parseInt(s.trim(), 10))
			.filter(n => !isNaN(n) && n >= 100 && n <= 900);

		const spec: FontSpec = {
			family: family.trim(),
			weights: weights.length ? weights : [400],
			source,
		};
		if (source === 'custom' && urls.length) {
			spec.urls = urls.map(u => ({
				weight: u.weight,
				...(u.style ? { style: u.style } : {}),
				url: u.url,
			}));
		}
		onUpdate(spec);
	}

	function addUrl() {
		urls = [...urls, { weight: 400, style: '', url: '' }];
		emit();
	}

	function removeUrl(i: number) {
		urls = urls.filter((_, idx) => idx !== i);
		emit();
	}

	function updateUrl(i: number, field: 'weight' | 'style' | 'url', val: string | number) {
		urls = urls.map((u, idx) => idx === i ? { ...u, [field]: val } : u);
		emit();
	}

	// Carga Google Font para el preview en vivo
	$effect(() => {
		if (source === 'google' && family) {
			const id = `gf-editor-${family.replace(/\s+/g, '-').toLowerCase()}`;
			if (!document.getElementById(id)) {
				const link = document.createElement('link');
				link.id   = id;
				link.rel  = 'stylesheet';
				link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
				document.head.appendChild(link);
			}
		}
	});

	const datalistId   = $derived(source === 'google' ? `gf-list-${uid}` : source === 'system' ? `sys-fonts-${uid}` : undefined);
	const fontListData = $derived(source === 'google' ? GOOGLE_FONTS : source === 'system' ? SYSTEM_FONTS : []);
</script>

<div class="space-y-3">
	<!-- Preview de fuente en vivo -->
	{#if family}
		<div class="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
			<p
				class="text-gray-800 leading-snug"
				style="font-family: '{family}', sans-serif; font-size: 22px;"
			>
				Aa — Ejemplo 123
			</p>
			<p
				class="text-gray-500 mt-1"
				style="font-family: '{family}', sans-serif; font-size: 13px;"
			>
				El zorro marrón salta sobre el perro perezoso.
			</p>
		</div>
	{/if}

	<!-- familia -->
	<div>
		<label for="fs-family-{uid}" class="block text-xs font-medium text-gray-600 mb-1">Familia</label>
		{#if datalistId}
			<datalist id={datalistId}>
				{#each fontListData as f (f)}
					<option value={f}>{f}</option>
				{/each}
			</datalist>
		{/if}
		<input
			id="fs-family-{uid}"
			type="text"
			bind:value={family}
			oninput={emit}
			list={datalistId}
			placeholder="Inter"
			autocomplete="off"
			class="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
		/>
	</div>

	<!-- source -->
	<div>
		<label for="fs-source-{uid}" class="block text-xs font-medium text-gray-600 mb-1">Origen</label>
		<select
			id="fs-source-{uid}"
			bind:value={source}
			onchange={emit}
			class="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
		>
			<option value="google">Google Fonts</option>
			<option value="system">Fuente del sistema</option>
			<option value="custom">Custom (URL)</option>
		</select>
	</div>

	<!-- weights -->
	<div>
		<label for="fs-weights-{uid}" class="block text-xs font-medium text-gray-600 mb-1">Pesos (uno por línea)</label>
		<textarea
			id="fs-weights-{uid}"
			bind:value={weightsText}
			oninput={emit}
			rows="3"
			placeholder="400&#10;500&#10;700"
			class="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm font-mono resize-y"
		></textarea>
	</div>

	<!-- urls (solo si custom) -->
	{#if source === 'custom'}
		<div>
			<div class="flex items-center justify-between mb-2">
				<span class="text-xs font-medium text-gray-600">URLs de fuente</span>
				<button
					type="button"
					onclick={addUrl}
					class="text-xs text-blue-600 hover:text-blue-800"
				>+ Añadir</button>
			</div>
			{#each urls as u, i (i)}
				<div class="flex gap-2 items-start mb-2">
					<input
						type="number" min="100" max="900" step="100"
						value={u.weight}
						oninput={(e) => updateUrl(i, 'weight', parseInt((e.target as HTMLInputElement).value, 10))}
						aria-label="Peso de fuente"
						class="w-20 border border-gray-300 rounded-md px-2 py-1 text-xs"
						placeholder="400"
					/>
					<input
						type="text"
						value={u.style}
						oninput={(e) => updateUrl(i, 'style', (e.target as HTMLInputElement).value)}
						aria-label="Estilo de fuente"
						class="w-20 border border-gray-300 rounded-md px-2 py-1 text-xs"
						placeholder="normal"
					/>
					<input
						type="url"
						value={u.url}
						oninput={(e) => updateUrl(i, 'url', (e.target as HTMLInputElement).value)}
						aria-label="URL de fuente"
						class="flex-1 border border-gray-300 rounded-md px-2 py-1 text-xs font-mono"
						placeholder="https://..."
					/>
					<button
						type="button"
						onclick={() => removeUrl(i)}
						class="text-gray-400 hover:text-red-500 px-1 py-1 text-sm"
					>✕</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
