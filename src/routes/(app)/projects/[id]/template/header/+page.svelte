<script lang="ts">
	import SchemaPropsForm from '$lib/components/SchemaPropsForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Encabezado — {data.project.name}</title></svelte:head>

<SchemaPropsForm
	entryKey="header"
	project={data.project}
	initialProps={(data.project.header_props as Record<string, unknown>) ?? {}}
	breadcrumbLabel="Encabezado"
	heading="Encabezado del sitio"
	submitLabel="Guardar encabezado"
	savedMessage="Encabezado guardado."
/>
