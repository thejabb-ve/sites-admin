<script lang="ts">
	import { untrack } from 'svelte';

	interface Props {
		value:    string;
		onUpdate: (v: string) => void;
	}

	let { value, onUpdate }: Props = $props();

	function parseOklch(s: string): [number, number, number] {
		const m = s.match(/^oklch\(\s*([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)/);
		return m ? [parseFloat(m[1]!), parseFloat(m[2]!), parseFloat(m[3]!)] : [0.5, 0.15, 250];
	}

	const [initL, initC, initH] = parseOklch(untrack(() => value));
	let l = $state(initL);
	let c = $state(initC);
	let h = $state(initH);
	let textRaw   = $state(untrack(() => value));
	let textValid = $state(true);

	function emitFromSliders() {
		const s = `oklch(${+l.toFixed(3)} ${+c.toFixed(4)} ${+h.toFixed(1)})`;
		textRaw = s;
		textValid = true;
		onUpdate(s);
	}

	function handleText(raw: string) {
		textRaw = raw;
		const m = raw.match(/^oklch\(\s*([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)/);
		if (m) {
			l = parseFloat(m[1]!);
			c = parseFloat(m[2]!);
			h = parseFloat(m[3]!);
			textValid = true;
			onUpdate(raw.trim());
		} else {
			textValid = false;
		}
	}
</script>

<div class="flex items-start gap-3">
	<!-- Swatch -->
	<div
		class="flex-shrink-0 w-10 h-10 rounded-md border border-black/10 mt-0.5"
		style="background: oklch({l} {c} {h});"
	></div>

	<div class="flex-1 space-y-1.5">
		<!-- Sliders -->
		<div class="grid grid-cols-3 gap-2 text-xs text-gray-500">
			<div>
				<span class="block mb-0.5">L {l.toFixed(3)}</span>
				<input
					type="range" min="0" max="1" step="0.01"
					bind:value={l}
					oninput={emitFromSliders}
					aria-label="Luminosidad"
					class="w-full h-1.5 accent-gray-700"
				/>
			</div>
			<div>
				<span class="block mb-0.5">C {c.toFixed(4)}</span>
				<input
					type="range" min="0" max="0.4" step="0.005"
					bind:value={c}
					oninput={emitFromSliders}
					aria-label="Croma"
					class="w-full h-1.5 accent-gray-700"
				/>
			</div>
			<div>
				<span class="block mb-0.5">H {h.toFixed(1)}°</span>
				<input
					type="range" min="0" max="360" step="1"
					bind:value={h}
					oninput={emitFromSliders}
					aria-label="Tono"
					class="w-full h-1.5 accent-gray-700"
				/>
			</div>
		</div>

		<!-- Input texto -->
		<input
			type="text"
			value={textRaw}
			oninput={(e) => handleText((e.target as HTMLInputElement).value)}
			class="w-full border rounded-md px-2 py-1 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent
				{textValid ? 'border-gray-300' : 'border-red-400 bg-red-50'}"
			placeholder="oklch(0.5 0.15 250)"
			spellcheck="false"
		/>
	</div>
</div>
