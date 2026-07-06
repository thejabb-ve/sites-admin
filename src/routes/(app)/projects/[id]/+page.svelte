<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>{data.project.name} — Panel</title></svelte:head>

<div class="space-y-8">
	<div class="flex items-center gap-2 text-sm text-gray-500">
		<a href="/dashboard" class="hover:text-gray-900">Proyectos</a>
		<span>/</span>
		<span class="text-gray-900 font-medium">{data.project.name}</span>
	</div>

	<h1 class="text-xl font-semibold text-gray-900">{data.project.name}</h1>

	<!-- Dominios -->
	<section>
		<h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Dominios</h2>
		{#if data.domains.length === 0}
			<p class="text-sm text-gray-500">Sin dominios configurados.</p>
		{:else}
			<ul class="divide-y divide-gray-100 bg-white border border-gray-200 rounded-lg">
				{#each data.domains as domain (domain.id)}
					<li class="px-4 py-3 flex items-center justify-between">
						<span class="text-sm text-gray-800 font-mono">{domain.domain}</span>
						<span
							class="text-xs px-2 py-0.5 rounded-full {domain.is_active
								? 'bg-green-50 text-green-700'
								: 'bg-gray-100 text-gray-500'}"
						>
							{domain.is_active ? 'Activo' : 'Inactivo'}
						</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Miembros -->
	<section>
		<h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Miembros</h2>
		{#if data.members.length === 0}
			<p class="text-sm text-gray-500">Sin miembros.</p>
		{:else}
			<ul class="divide-y divide-gray-100 bg-white border border-gray-200 rounded-lg">
				{#each data.members as member (member.user_id)}
					<li class="px-4 py-3 flex items-center justify-between">
						<span class="text-sm text-gray-800">{member.display_name}</span>
						<span class="text-xs text-gray-600 capitalize">{member.role_name}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>
