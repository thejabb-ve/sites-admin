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
</script>

<div class="space-y-3">
	<!-- family -->
	<div>
		<label for="fs-family" class="block text-xs font-medium text-gray-600 mb-1">Familia</label>
		<input
			id="fs-family"
			type="text"
			bind:value={family}
			oninput={emit}
			placeholder="Inter"
			class="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
		/>
	</div>

	<!-- source -->
	<div>
		<label for="fs-source" class="block text-xs font-medium text-gray-600 mb-1">Fuente</label>
		<select
			id="fs-source"
			bind:value={source}
			onchange={emit}
			class="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm"
		>
			<option value="google">Google Fonts</option>
			<option value="system">Sistema</option>
			<option value="custom">Custom (URL)</option>
		</select>
	</div>

	<!-- weights -->
	<div>
		<label for="fs-weights" class="block text-xs font-medium text-gray-600 mb-1">Pesos (uno por línea)</label>
		<textarea
			id="fs-weights"
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
