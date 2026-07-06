<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let loading = $state(false);
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
				<input
					id="password"
					name="password"
					type="password"
					autocomplete="current-password"
					required
					class="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
				/>
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
