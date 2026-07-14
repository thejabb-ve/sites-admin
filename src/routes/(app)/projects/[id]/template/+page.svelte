<script lang="ts">
  import { page } from '$app/state';
</script>
<svelte:head><title>Plantilla del sitio</title></svelte:head>

<div class="space-y-6">
  <div class="flex items-center gap-2 text-sm text-gray-500">
    <a href="/dashboard" class="hover:text-gray-900">Proyectos</a>
    <span>/</span>
    <a href="/projects/{page.params.id}" class="hover:text-gray-900">Proyecto</a>
    <span>/</span>
    <span class="text-gray-900 font-medium">Plantilla del sitio</span>
  </div>
  <h1 class="text-xl font-semibold text-gray-900">Plantilla del sitio</h1>
  <div class="grid grid-cols-2 gap-4">
    <a href="/projects/{page.params.id}/template/header" class="block p-6 bg-white border border-gray-200 rounded-lg hover:border-gray-400 transition-colors">
      <h2 class="font-medium text-gray-900">Encabezado</h2>
      <p class="text-sm text-gray-500 mt-1">Navegación y logo del sitio</p>
    </a>
    <a href="/projects/{page.params.id}/template/footer" class="block p-6 bg-white border border-gray-200 rounded-lg hover:border-gray-400 transition-colors">
      <h2 class="font-medium text-gray-900">Pie de página</h2>
      <p class="text-sm text-gray-500 mt-1">Columnas de enlaces, redes sociales y legal</p>
    </a>
  </div>
</div>
