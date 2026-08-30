<script lang="ts">
	import { untrack }        from 'svelte';
	import { enhance }        from '$app/forms';
	import { toast }          from '$lib/toast.svelte';
	import ConfirmDialog      from '$lib/components/ConfirmDialog.svelte';
	import type { LegalDraft } from '$lib/types';
	import type { ActionResult } from '@sveltejs/kit';

	interface Props {
		address:      string;
		legalName:    string;
		taxId:        string;
		businessType: string;
		postalCode:   string;
		city:         string;
		region:       string;
		country:      string;
		email:        string;
		phone:        string;
		legalLinks:   { label: string; href: string }[];
		action:       string;
		onUpdate:     (v: LegalDraft) => void;
	}

	let { address, legalName, taxId, businessType, postalCode, city, region, country, email, phone, legalLinks, action, onUpdate }: Props = $props();

	// ─── Estado interno ────────────────────────────────────────────────────────

	let legalAddress      = $state(untrack(() => address));
	let legalName_        = $state(untrack(() => legalName));
	let legalTaxId        = $state(untrack(() => taxId));
	let legalBusinessType = $state(untrack(() => businessType));
	let legalPostalCode   = $state(untrack(() => postalCode));
	let legalCity         = $state(untrack(() => city));
	let legalState        = $state(untrack(() => region));
	let legalCountry      = $state(untrack(() => country));
	let legalEmail        = $state(untrack(() => email));
	let legalPhone        = $state(untrack(() => phone));
	let legalLinks_       = $state<{ label: string; href: string }[]>(
		untrack(() => legalLinks.map(l => ({ ...l })))
	);

	let confirmLegal    = $state(false);
	let generatingLegal = $state(false);
	let legalFormEl      = $state<HTMLFormElement | undefined>();

	function doGenerateLegal() { legalFormEl?.requestSubmit(); }

	// ─── Emisión de cambios al padre ───────────────────────────────────────────

	function emit() {
		onUpdate({
			address:       legalAddress,
			legal_name:    legalName_,
			tax_id:        legalTaxId,
			business_type: legalBusinessType,
			postal_code:   legalPostalCode,
			city:          legalCity,
			state:         legalState,
			country:       legalCountry,
			email:         legalEmail,
			phone:         legalPhone,
			legalLinks:    legalLinks_,
		});
	}

	// ─── Helpers enlaces legales ───────────────────────────────────────────────

	function addLegalLink() {
		legalLinks_ = [...legalLinks_, { label: '', href: '' }];
		emit();
	}
	function removeLegalLink(i: number) {
		legalLinks_ = legalLinks_.filter((_, idx) => idx !== i);
		emit();
	}
	function updateLegalLink(i: number, field: 'label' | 'href', val: string) {
		legalLinks_ = legalLinks_.map((l, idx) => idx === i ? { ...l, [field]: val } : l);
		emit();
	}
</script>

<form
	method="POST"
	{action}
	bind:this={legalFormEl}
	use:enhance={() => {
		generatingLegal = true;
		return async ({ result, update }: { result: ActionResult; update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			generatingLegal = false;
			if (result.type === 'success') {
				toast('success', 'Páginas legales generadas correctamente.');
			} else if (result.type === 'failure') {
				toast('error', (result.data as Record<string, string>)?.error ?? 'Error al generar páginas legales.');
			}
		};
	}}
></form>

<ConfirmDialog
	bind:open={confirmLegal}
	title="Generar páginas legales"
	message="Se crearán o sobreescribirán las páginas /aviso-legal, /politica-de-privacidad y /politica-de-cookies usando los datos de la sección Legal. ¿Continuar?"
	confirmLabel="Generar"
	onConfirm={doGenerateLegal}
/>

<div class="bg-white border border-border-subtle rounded-lg p-6 space-y-5">

	<!-- Identificación fiscal -->
	<div>
		<h3 class="text-sm font-semibold text-gray-800 mb-4">Datos de la empresa</h3>
		<div class="space-y-4">
			<div>
				<label for="legal-name" class="block text-xs font-medium text-muted mb-1">Nombre legal de la empresa</label>
				<input
					id="legal-name"
					type="text"
					value={legalName_}
					oninput={(e) => { legalName_ = (e.target as HTMLInputElement).value; emit(); }}
					placeholder="Mi Empresa S.A. de C.V."
					class="w-full border border-border rounded-md px-3 py-2 text-sm"
				/>
			</div>
			<div>
				<label for="legal-business-type" class="block text-xs font-medium text-muted mb-1">Razón social / Giro de negocio</label>
				<input
					id="legal-business-type"
					type="text"
					value={legalBusinessType}
					oninput={(e) => { legalBusinessType = (e.target as HTMLInputElement).value; emit(); }}
					placeholder="Servicios de tecnología"
					class="w-full border border-border rounded-md px-3 py-2 text-sm"
				/>
			</div>
			<div>
				<label for="legal-tax-id" class="block text-xs font-medium text-muted mb-1">Número de identificación fiscal (RFC / NIT / CIF…)</label>
				<input
					id="legal-tax-id"
					type="text"
					value={legalTaxId}
					oninput={(e) => { legalTaxId = (e.target as HTMLInputElement).value; emit(); }}
					placeholder="XAXX010101000"
					class="w-full border border-border rounded-md px-3 py-2 text-sm font-mono"
				/>
			</div>
		</div>
	</div>

	<hr class="border-border-faint" />

	<!-- Dirección -->
	<div>
		<h3 class="text-sm font-semibold text-gray-800 mb-4">Dirección</h3>
		<div class="space-y-4">
			<div>
				<label for="legal-address" class="block text-xs font-medium text-muted mb-1">Calle y número</label>
				<textarea
					id="legal-address"
					rows="2"
					oninput={(e) => { legalAddress = (e.target as HTMLTextAreaElement).value; emit(); }}
					placeholder="Av. Ejemplo 123, Col. Centro"
					class="w-full border border-border rounded-md px-3 py-2 text-sm resize-y"
				>{legalAddress}</textarea>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="legal-postal-code" class="block text-xs font-medium text-muted mb-1">Código postal</label>
					<input
						id="legal-postal-code"
						type="text"
						value={legalPostalCode}
						oninput={(e) => { legalPostalCode = (e.target as HTMLInputElement).value; emit(); }}
						placeholder="06600"
						class="w-full border border-border rounded-md px-3 py-2 text-sm"
					/>
				</div>
				<div>
					<label for="legal-city" class="block text-xs font-medium text-muted mb-1">Ciudad</label>
					<input
						id="legal-city"
						type="text"
						value={legalCity}
						oninput={(e) => { legalCity = (e.target as HTMLInputElement).value; emit(); }}
						placeholder="Ciudad de México"
						class="w-full border border-border rounded-md px-3 py-2 text-sm"
					/>
				</div>
			</div>
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label for="legal-state" class="block text-xs font-medium text-muted mb-1">Estado / Provincia</label>
					<input
						id="legal-state"
						type="text"
						value={legalState}
						oninput={(e) => { legalState = (e.target as HTMLInputElement).value; emit(); }}
						placeholder="CDMX"
						class="w-full border border-border rounded-md px-3 py-2 text-sm"
					/>
				</div>
				<div>
					<label for="legal-country" class="block text-xs font-medium text-muted mb-1">País</label>
					<input
						id="legal-country"
						type="text"
						value={legalCountry}
						oninput={(e) => { legalCountry = (e.target as HTMLInputElement).value; emit(); }}
						placeholder="México"
						class="w-full border border-border rounded-md px-3 py-2 text-sm"
					/>
				</div>
			</div>
		</div>
	</div>

	<hr class="border-border-faint" />

	<!-- Contacto -->
	<div>
		<h3 class="text-sm font-semibold text-gray-800 mb-4">Contacto</h3>
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="legal-email" class="block text-xs font-medium text-muted mb-1">Correo electrónico</label>
				<input
					id="legal-email"
					type="email"
					value={legalEmail}
					oninput={(e) => { legalEmail = (e.target as HTMLInputElement).value; emit(); }}
					placeholder="contacto@empresa.com"
					class="w-full border border-border rounded-md px-3 py-2 text-sm"
				/>
			</div>
			<div>
				<label for="legal-phone" class="block text-xs font-medium text-muted mb-1">Teléfono</label>
				<input
					id="legal-phone"
					type="tel"
					value={legalPhone}
					oninput={(e) => { legalPhone = (e.target as HTMLInputElement).value; emit(); }}
					placeholder="+52 55 1234 5678"
					class="w-full border border-border rounded-md px-3 py-2 text-sm"
				/>
			</div>
		</div>
	</div>

	<hr class="border-border-faint" />

	<!-- Enlaces legales -->
	<div>
		<div class="flex items-center justify-between mb-3">
			<h3 class="text-sm font-semibold text-gray-800">Enlaces legales</h3>
			<button type="button" onclick={addLegalLink} class="text-xs text-primary hover:text-primary-hover">
				+ Añadir enlace
			</button>
		</div>
		{#each legalLinks_ as link, i (i)}
			<div class="flex gap-2 items-center mb-2">
				<input
					type="text"
					value={link.label}
					oninput={(e) => updateLegalLink(i, 'label', (e.target as HTMLInputElement).value)}
					placeholder="Aviso Legal"
					class="w-36 border border-border rounded-md px-2 py-1.5 text-sm"
				/>
				<input
					type="url"
					value={link.href}
					oninput={(e) => updateLegalLink(i, 'href', (e.target as HTMLInputElement).value)}
					placeholder="https://..."
					class="flex-1 border border-border rounded-md px-2 py-1.5 text-sm font-mono"
				/>
				<button type="button" onclick={() => removeLegalLink(i)} class="text-faint hover:text-danger px-1">
					✕
				</button>
			</div>
		{/each}
		{#if !legalLinks_.length}
			<p class="text-xs text-faint">Sin enlaces legales configurados.</p>
		{/if}
	</div>

	<hr class="border-border-faint" />

	<!-- Generar páginas legales -->
	<div class="border border-border-subtle rounded-lg p-4 bg-surface-muted">
		<p class="text-sm font-medium text-body mb-1">Páginas legales</p>
		<p class="text-xs text-subtle mb-3">
			Crea o sobreescribe las tres páginas legales del sitio usando los datos configurados arriba.
			Si los campos están vacíos se incluirán marcadores de posición visibles.
		</p>
		<button
			type="button"
			onclick={() => { confirmLegal = true; }}
			disabled={generatingLegal}
			class="px-3 py-1.5 text-sm border border-border rounded-md text-body hover:border-faint transition-colors disabled:opacity-50"
		>
			{generatingLegal ? 'Generando…' : 'Generar páginas legales'}
		</button>
	</div>
</div>
