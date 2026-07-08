<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading      = $state(false);
	let showPassword = $state(false);
</script>

<svelte:head><title>Iniciar sesión — Panel</title></svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
	<div class="w-full max-w-sm">
		<h1 class="text-2xl font-semibold text-gray-900 mb-6 text-center">Panel de administración</h1>

		<form
			method="POST"
			use:enhance={() => {
				loading = true;
				return async ({ update }) => {
					await update();
					loading = false;
				};
			}}
			class="bg-white shadow rounded-lg p-8 space-y-5"
		>
			{#if form?.error}
				<p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
					{form.error}
				</p>
			{/if}

			<div>
				<label for="email" class="block text-sm font-medium text-gray-700 mb-1">Email</label>
				<input
					id="email"
					name="email"
					type="email"
					autocomplete="email"
					required
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
				/>
			</div>

			<div>
				<label for="password" class="block text-sm font-medium text-gray-700 mb-1"
					>Contraseña</label
				>
				<div class="relative">
					<input
						id="password"
						name="password"
						type={showPassword ? 'text' : 'password'}
						autocomplete="current-password"
						required
						class="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
					/>
					<button
						type="button"
						onclick={() => (showPassword = !showPassword)}
						aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
						class="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
					>
						{#if showPassword}
							<!-- ojo tachado -->
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
								<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
								<line x1="1" y1="1" x2="23" y2="23"/>
							</svg>
						{:else}
							<!-- ojo abierto -->
							<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
								<circle cx="12" cy="12" r="3"/>
							</svg>
						{/if}
					</button>
				</div>
			</div>

			<!-- Honeypot: oculto para humanos, los bots lo rellenan -->
			<div aria-hidden="true" class="absolute -left-[9999px] w-px h-px overflow-hidden">
				<label for="hp_field">Nombre de empresa</label>
				<input id="hp_field" name="hp_field" type="checkbox" tabindex="-1" autocomplete="off" />
			</div>

			<button
				type="submit"
				disabled={loading}
				class="w-full bg-gray-900 text-white rounded-md py-2 text-sm font-medium hover:bg-gray-700 disabled:opacity-60 transition-colors"
			>
				{loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
			</button>
		</form>
	</div>
</div>
