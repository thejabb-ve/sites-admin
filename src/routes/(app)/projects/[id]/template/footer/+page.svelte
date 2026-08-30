<script lang="ts">
	import SchemaPropsForm from '$lib/components/SchemaPropsForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head><title>Pie de página — {data.project.name}</title></svelte:head>

<SchemaPropsForm
	entryKey="footer"
	project={data.project}
	initialProps={(data.project.footer_props as Record<string, unknown>) ?? {}}
	breadcrumbLabel="Pie de página"
	heading="Pie de página del sitio"
	submitLabel="Guardar pie de página"
	savedMessage="Pie de página guardado."
/>
