<script lang="ts">
	import type { LayoutData } from './$types';
	import Toaster from '$lib/components/Toaster.svelte';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-white border-b border-gray-200">
		<div class="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
			<a href="/dashboard" class="text-sm font-semibold text-gray-900">Panel</a>
			<div class="flex items-center gap-4">
				<a href="/help" class="text-sm text-gray-500 hover:text-gray-900 transition-colors">Ayuda</a>
				<span class="text-sm text-gray-500">{data.user?.email}</span>
				<form method="POST" action="/api/auth/signout">
					<button
						type="submit"
						class="text-sm text-gray-600 hover:text-gray-900 transition-colors"
					>
						Cerrar sesión
					</button>
				</form>
			</div>
		</div>
	</header>

	<main class="max-w-6xl mx-auto px-4 py-8">
		{@render children()}
	</main>
</div>

<Toaster />
