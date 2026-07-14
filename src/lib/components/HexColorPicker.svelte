<script lang="ts">
	import { untrack } from 'svelte';

	interface Props {
		value:    string;
		onUpdate: (v: string) => void;
	}

	let { value, onUpdate }: Props = $props();

	// ─── Conversión OKLCH ↔ HEX (matemática pura, sin dependencias) ──────────

	function toLinear(c: number): number {
		return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	}

	function toSRGB(c: number): number {
		return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
	}

	function hexToOklch(hex: string): [number, number, number] {
		const r = parseInt(hex.slice(1, 3), 16) / 255;
		const g = parseInt(hex.slice(3, 5), 16) / 255;
		const b = parseInt(hex.slice(5, 7), 16) / 255;

		const [lr, lg, lb] = [r, g, b].map(toLinear);

		const x = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
		const y = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
		const z = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

		const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
		const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
		const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z);

		const L  =  0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_;
		const a  =  1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_;
		const bv =  0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_;

		const C = Math.sqrt(a * a + bv * bv);
		const H = ((Math.atan2(bv, a) * 180 / Math.PI) + 360) % 360;

		return [L, C, H];
	}

	function oklchToHex(L: number, C: number, H: number): string {
		const hRad = H * Math.PI / 180;
		const a  = C * Math.cos(hRad);
		const bv = C * Math.sin(hRad);

		const l_ = L + 0.3963377774 * a + 0.2158037573 * bv;
		const m_ = L - 0.1055613458 * a - 0.0638541728 * bv;
		const s_ = L - 0.0894841775 * a - 1.2914855480 * bv;

		const l = l_ ** 3;
		const m = m_ ** 3;
		const s = s_ ** 3;

		let r  =  4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
		let g  = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
		let bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

		r  = Math.max(0, Math.min(1, r));
		g  = Math.max(0, Math.min(1, g));
		bl = Math.max(0, Math.min(1, bl));

		const [sr, sg, sb] = [r, g, bl].map(toSRGB);

		const h2 = (c: number) => Math.round(c * 255).toString(16).padStart(2, '0');
		return `#${h2(sr)}${h2(sg)}${h2(sb)}`;
	}

	function parseOklch(s: string): [number, number, number] {
		const m = s.match(/^oklch\(\s*([\d.e+-]+)\s+([\d.e+-]+)\s+([\d.e+-]+)/);
		return m ? [parseFloat(m[1]!), parseFloat(m[2]!), parseFloat(m[3]!)] : [0.5, 0.15, 250];
	}

	// ─── Estado ──────────────────────────────────────────────────────────────

	const [initL, initC, initH] = parseOklch(untrack(() => value));
	let L = $state(initL);
	let C = $state(initC);
	let H = $state(initH);

	let hex      = $state(oklchToHex(initL, initC, initH));
	let hexText  = $state(oklchToHex(initL, initC, initH));
	let hexValid = $state(true);

	function emitFromHex(h: string) {
		hex     = h;
		hexText = h;
		hexValid = true;
		const [nl, nc, nh] = hexToOklch(h);
		L = nl; C = nc; H = nh;
		onUpdate(`oklch(${+nl.toFixed(3)} ${+nc.toFixed(4)} ${+nh.toFixed(1)})`);
	}

	function handleHexText(raw: string) {
		hexText = raw;
		if (/^#[0-9a-fA-F]{6}$/.test(raw)) {
			emitFromHex(raw);
		} else {
			hexValid = false;
		}
	}
</script>

<div class="flex items-center gap-3">
	<!-- Swatch + picker nativo del OS -->
	<div class="relative flex-shrink-0">
		<div
			class="w-10 h-10 rounded-md border border-black/10 cursor-pointer"
			style="background: oklch({L} {C} {H});"
			title="Haz clic para abrir el selector de color"
		></div>
		<input
			type="color"
			value={hex}
			oninput={(e) => emitFromHex((e.target as HTMLInputElement).value)}
			class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
			aria-label="Selector de color"
		/>
	</div>

	<!-- Input HEX -->
	<input
		type="text"
		value={hexText}
		oninput={(e) => handleHexText((e.target as HTMLInputElement).value)}
		class="flex-1 border rounded-md px-2 py-1.5 text-sm font-mono uppercase tracking-wider focus:ring-2 focus:ring-blue-500 focus:border-transparent
			{hexValid ? 'border-gray-300' : 'border-red-400 bg-red-50'}"
		placeholder="#3b82f6"
		maxlength="7"
		spellcheck="false"
	/>
</div>
