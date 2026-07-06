<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Dashboard — Panel</title></svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold text-gray-900">Mis proyectos</h1>
	</div>

	{#if data.projects.length === 0}
		<div class="bg-white border border-gray-200 rounded-lg p-10 text-center">
			<p class="text-gray-500 text-sm">No tienes proyectos asignados.</p>
		</div>
	{:else}
		<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.projects as project (project.id)}
				<li>
					<a
						href="/projects/{project.id}"
						class="block bg-white border border-gray-200 rounded-lg p-5 hover:border-gray-400 hover:shadow-sm transition-all"
					>
						<p class="font-medium text-gray-900">{project.name}</p>
						<p class="text-xs text-gray-400 mt-1">
							{new Date(project.created_at).toLocaleDateString('es-MX')}
						</p>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
