<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const ACTION_LABELS: Record<string, string> = {
		create:      'Crear',
		update:      'Editar',
		delete:      'Eliminar',
		publish:     'Publicar',
		archive:     'Archivar',
		restore:     'Restaurar',
		purge_cache: 'Purgar caché',
		configure:   'Configurar',
		disconnect:  'Desconectar',
	};

	const RESOURCE_LABELS: Record<string, string> = {
		page:            'Página',
		asset:           'Asset',
		brand:           'Marca',
		settings:        'Configuración',
		template:        'Plantilla',
		block:           'Bloque',
		cache:           'Caché',
		domain:          'Dominio',
		collection_item: 'Ítem de colección',
	};

	const TYPE_FILTERS = [
		{ value: 'all',             label: 'Todos' },
		{ value: 'page',            label: 'Páginas' },
		{ value: 'collection_item', label: 'Colecciones' },
		{ value: 'asset',           label: 'Assets' },
		{ value: 'brand',           label: 'Marca' },
		{ value: 'settings',        label: 'Configuración' },
		{ value: 'template',        label: 'Plantilla' },
		{ value: 'block',           label: 'Bloques' },
		{ value: 'cache',           label: 'Caché' },
		{ value: 'domain',          label: 'Dominios' },
	];

	function formatDate(iso: string) {
		const d = new Date(iso);
		return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
			+ ' '
			+ d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false });
	}

	function filterHref(type: string, page = 1) {
		const params = new URLSearchParams();
		params.set('type', type);
		if (page > 1) params.set('page', String(page));
		return `?${params.toString()}`;
	}
</script>

<svelte:head><title>{data.project.name} — Panel</title></svelte:head>

<div class="space-y-8">
	<div class="flex items-center gap-2 text-sm text-subtle">
		<a href="/dashboard" class="hover:text-ink">Proyectos</a>
		<span>/</span>
		<span class="text-ink font-medium">{data.project.name}</span>
	</div>

	<div class="flex items-center justify-between flex-wrap gap-3">
		<h1 class="text-xl font-semibold text-ink">{data.project.name}</h1>
		<div class="flex items-center gap-2">
			<a
				href="/projects/{data.project.id}/pages"
				class="px-3 py-1.5 text-sm border border-border-subtle rounded-md text-body hover:border-faint hover:text-ink transition-colors"
			>
				Páginas
			</a>
			<a
				href="/projects/{data.project.id}/collections"
				class="px-3 py-1.5 text-sm border border-border-subtle rounded-md text-body hover:border-faint hover:text-ink transition-colors"
			>
				Colecciones
			</a>
			<a
				href="/projects/{data.project.id}/assets"
				class="px-3 py-1.5 text-sm border border-border-subtle rounded-md text-body hover:border-faint hover:text-ink transition-colors"
			>
				Assets
			</a>
			<a
				href="/projects/{data.project.id}/brand"
				class="px-3 py-1.5 text-sm border border-border-subtle rounded-md text-body hover:border-faint hover:text-ink transition-colors"
			>
				Marca
			</a>
			<a
				href="/projects/{data.project.id}/template"
				class="px-3 py-1.5 text-sm border border-border-subtle rounded-md text-body hover:border-faint hover:text-ink transition-colors"
			>
				Plantilla
			</a>
			<a
				href="/projects/{data.project.id}/domains"
				class="px-3 py-1.5 text-sm border border-border-subtle rounded-md text-body hover:border-faint hover:text-ink transition-colors"
			>
				Dominios
			</a>
			<a
				href="/projects/{data.project.id}/settings"
				class="px-3 py-1.5 text-sm border border-border-subtle rounded-md text-body hover:border-faint hover:text-ink transition-colors"
			>
				Configuración
			</a>
		</div>
	</div>

	<!-- Dominios -->
	<section>
		<h2 class="text-sm font-semibold text-body uppercase tracking-wide mb-3">Dominios</h2>
		{#if data.domains.length === 0}
			<p class="text-sm text-subtle">Sin dominios configurados.</p>
		{:else}
			<ul class="divide-y divide-border-faint bg-white border border-border-subtle rounded-lg">
				{#each data.domains as domain (domain.id)}
					<li class="px-4 py-3 flex items-center justify-between">
						<span class="text-sm text-gray-800 font-mono">{domain.domain}</span>
						<span
							class="text-xs px-2 py-0.5 rounded-full {domain.is_active
								? 'bg-green-50 text-success'
								: 'bg-surface-muted-strong text-subtle'}"
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
		<h2 class="text-sm font-semibold text-body uppercase tracking-wide mb-3">Miembros</h2>
		{#if data.members.length === 0}
			<p class="text-sm text-subtle">Sin miembros.</p>
		{:else}
			<ul class="divide-y divide-border-faint bg-white border border-border-subtle rounded-lg">
				{#each data.members as member (member.user_id)}
					<li class="px-4 py-3 flex items-center justify-between">
						<span class="text-sm text-gray-800">{member.display_name}</span>
						<span class="text-xs text-muted capitalize">{member.role_name}</span>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- Registro de actividad -->
	<section>
		<h2 class="text-sm font-semibold text-body uppercase tracking-wide mb-3">
			Registro de actividad
			{#if data.logTotal > 0}
				<span class="ml-2 text-xs font-normal text-faint normal-case">
					{data.logTotal} {data.logTotal === 1 ? 'evento' : 'eventos'}
				</span>
			{/if}
		</h2>

		<!-- Filtros -->
		<div class="flex flex-wrap gap-1 mb-3">
			{#each TYPE_FILTERS as f}
				<a
					href={filterHref(f.value)}
					class="px-3 py-1 text-xs rounded-full border transition-colors
						{data.logType === f.value
							? 'bg-primary text-white border-primary'
							: 'border-border-subtle text-muted hover:border-faint hover:text-ink'}"
				>
					{f.label}
				</a>
			{/each}
		</div>

		{#if data.logs.length === 0}
			<div class="bg-white border border-border-subtle rounded-lg p-8 text-center">
				<p class="text-sm text-faint">No hay registros de actividad aún.</p>
			</div>
		{:else}
			<div class="bg-white border border-border-subtle rounded-lg overflow-hidden">
				<!-- Header de tabla -->
				<div class="hidden md:grid grid-cols-[140px_1fr_1fr_100px_60px] gap-3 px-4 py-2 bg-surface-muted border-b border-border-faint text-xs font-medium text-subtle uppercase tracking-wide">
					<span>Fecha</span>
					<span>Actor / Acción</span>
					<span>Recurso</span>
					<span>Campos</span>
					<span>Estado</span>
				</div>

				<div class="divide-y divide-border-faint">
					{#each data.logs as log (log.id)}
						<div class="px-4 py-3 grid md:grid-cols-[140px_1fr_1fr_100px_60px] gap-1 md:gap-3 items-start">
							<!-- Fecha -->
							<span class="text-xs text-faint font-mono whitespace-nowrap">
								{formatDate(log.created_at)}
							</span>

							<!-- Actor / Acción -->
							<div class="min-w-0">
								<span class="text-xs font-medium text-body block truncate">
									{ACTION_LABELS[log.action] ?? log.action}
								</span>
								{#if log.actor === 'system'}
									<span class="text-xs text-faint italic">sistema</span>
								{:else}
									<span class="text-xs text-faint truncate block">{log.actor}</span>
								{/if}
							</div>

							<!-- Recurso -->
							<div class="min-w-0">
								<span class="text-xs text-subtle">
									{RESOURCE_LABELS[log.resource_type] ?? log.resource_type}
								</span>
								{#if log.resource_name}
									<span class="text-xs text-body block truncate">{log.resource_name}</span>
								{/if}
							</div>

							<!-- Campos cambiados -->
							<div class="flex flex-wrap gap-1">
								{#if log.changed}
									{#each log.changed as field}
										<span class="text-xs px-1.5 py-0.5 bg-surface-muted-strong text-muted rounded font-mono">{field}</span>
									{/each}
								{/if}
							</div>

							<!-- Estado -->
							<span
								class="text-xs px-2 py-0.5 rounded-full font-medium self-start
									{log.status === 'error'
										? 'bg-red-50 text-danger'
										: 'bg-green-50 text-success'}"
								title={log.error_message ?? ''}
							>
								{log.status === 'error' ? 'Error' : 'OK'}
							</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Paginación -->
			{#if data.logTotalPages > 1}
				<div class="flex items-center justify-between mt-3">
					<a
						href={filterHref(data.logType, data.logPage - 1)}
						class="px-3 py-1.5 text-sm border border-border-subtle rounded-md text-muted transition-colors
							{data.logPage <= 1
								? 'pointer-events-none opacity-40'
								: 'hover:border-faint hover:text-ink'}"
						aria-disabled={data.logPage <= 1}
					>
						← Anterior
					</a>

					<span class="text-xs text-subtle">
						Página {data.logPage} de {data.logTotalPages}
					</span>

					<a
						href={filterHref(data.logType, data.logPage + 1)}
						class="px-3 py-1.5 text-sm border border-border-subtle rounded-md text-muted transition-colors
							{data.logPage >= data.logTotalPages
								? 'pointer-events-none opacity-40'
								: 'hover:border-faint hover:text-ink'}"
						aria-disabled={data.logPage >= data.logTotalPages}
					>
						Siguiente →
					</a>
				</div>
			{/if}
		{/if}
	</section>
</div>
