<script lang="ts">
	import { toast } from '$lib/toast.svelte';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ── Estado del wizard ─────────────────────────────────────────────────────
	type Step = 'search' | 'confirm' | 'configuring' | 'done' | 'error';

	let step        = $state<Step>('search');
	let domainInput = $state('');
	let checking    = $state(false);
	let available   = $state<boolean | null>(null);
	// Guardamos si el dominio estaba disponible para mostrar el contexto correcto en confirm/configuring
	let wasAvailable = $state(false);
	let activeDomainId = $state<string | null>(null);
	let configError = $state('');
	let submitting  = $state(false);
	let pollInterval: ReturnType<typeof setInterval> | null = null;

	// ── Desconetar dominio ────────────────────────────────────────────────────
	let confirmDisconnect = $state(false);
	let disconnectId      = $state('');
	let disconnectName    = $state('');
	let disconnecting     = $state(false);

	function askDisconnect(id: string, name: string) {
		disconnectId   = id;
		disconnectName = name;
		confirmDisconnect = true;
	}

	async function doDisconnect() {
		disconnecting = true;
		try {
			const res = await fetch(`/api/projects/${data.project.id}/domains`, {
				method:  'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ domainId: disconnectId }),
			});
			if (!res.ok) {
				const { error: msg } = await res.json() as { error: string };
				toast('error', msg ?? 'Error al desconectar el dominio.');
			} else {
				toast('success', `${disconnectName} desconectado correctamente.`);
				location.reload();
			}
		} finally {
			disconnecting = false;
		}
	}

	// ── Step 1: comprobar disponibilidad ──────────────────────────────────────
	async function checkDomain() {
		const d = domainInput.trim().toLowerCase();
		if (!d) return;
		checking  = true;
		available = null;
		try {
			const res  = await fetch(`/api/projects/${data.project.id}/domains?check=${encodeURIComponent(d)}`);
			const json = await res.json() as { available?: boolean; error?: string };
			if (!res.ok || json.error) {
				toast('error', json.error ?? 'Error al comprobar el dominio.');
			} else {
				available = json.available ?? false;
			}
		} finally {
			checking = false;
		}
	}

	function goToConfirm(domainIsAvailable: boolean) {
		wasAvailable = domainIsAvailable;
		step = 'confirm';
	}

	// ── Step 2: confirmar y lanzar ────────────────────────────────────────────
	async function startSetup() {
		submitting = true;
		try {
			const res  = await fetch(`/api/projects/${data.project.id}/domains`, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({ domain: domainInput.trim().toLowerCase() }),
			});
			const json = await res.json() as { ok?: boolean; domainId?: string; error?: string };
			if (!res.ok || !json.ok) {
				toast('error', json.error ?? 'Error al iniciar la configuración.');
				step = 'search';
			} else {
				activeDomainId = json.domainId ?? null;
				step           = 'configuring';
				startPolling();
			}
		} finally {
			submitting = false;
		}
	}

	// ── Step 3: polling de estado ─────────────────────────────────────────────
	function startPolling() {
		pollInterval = setInterval(pollStatus, 3000);
	}

	async function pollStatus() {
		if (!activeDomainId) return;
		try {
			const res  = await fetch(`/api/projects/${data.project.id}/domains?statusOf=${activeDomainId}`);
			const json = await res.json() as { status?: string; error_message?: string };
			if (!res.ok) return;

			const s = json.status ?? '';
			if (s === 'active') {
				stopPolling();
				step = 'done';
			} else if (s === 'error') {
				stopPolling();
				configError = json.error_message ?? 'Error desconocido durante la configuración.';
				step        = 'error';
			}
		} catch { /* ignorar errores de red durante el polling */ }
	}

	function stopPolling() {
		if (pollInterval !== null) {
			clearInterval(pollInterval);
			pollInterval = null;
		}
	}

	function reset() {
		stopPolling();
		step           = 'search';
		domainInput    = '';
		available      = null;
		wasAvailable   = false;
		activeDomainId = null;
		configError    = '';
	}

	// ── Helpers de UI ─────────────────────────────────────────────────────────
	const STATUS_BADGE: Record<string, string> = {
		pending:     'bg-gray-100 text-gray-600',
		configuring: 'bg-yellow-50 text-yellow-700',
		active:      'bg-green-50 text-green-700',
		error:       'bg-red-50 text-red-700',
	};

	const STATUS_LABEL: Record<string, string> = {
		pending:     'Pendiente',
		configuring: 'Configurando…',
		active:      'Activo',
		error:       'Error',
	};
</script>

<svelte:head><title>Dominios — {data.project.name}</title></svelte:head>

<ConfirmDialog
	bind:open={confirmDisconnect}
	title="Desconectar dominio"
	message="¿Desconectar {disconnectName}? El dominio dejará de servir el sitio. La zona de Cloudflare no se eliminará."
	confirmLabel={disconnecting ? 'Desconectando…' : 'Desconectar'}
	danger={true}
	onConfirm={doDisconnect}
/>

<div class="space-y-8">
	<!-- Breadcrumb + título -->
	<div class="flex items-center gap-2 text-sm text-gray-500">
		<a href="/dashboard" class="hover:text-gray-900">Proyectos</a>
		<span>/</span>
		<a href="/projects/{data.project.id}" class="hover:text-gray-900">{data.project.name}</a>
		<span>/</span>
		<span class="text-gray-900 font-medium">Dominios</span>
	</div>

	<h1 class="text-xl font-semibold text-gray-900">Gestión de dominios</h1>

	<!-- ── Lista de dominios existentes ─────────────────────────────────── -->
	{#if data.domains.length > 0}
		<section>
			<h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
				Dominios conectados
			</h2>
			<ul class="divide-y divide-gray-100 bg-white border border-gray-200 rounded-lg">
				{#each data.domains as domain (domain.id)}
					<li class="px-4 py-3 flex items-center justify-between gap-4">
						<div class="flex items-center gap-3 min-w-0">
							<span class="text-sm text-gray-800 font-mono truncate">{domain.domain}</span>
							{#if domain.status === 'active'}
								<a
									href="https://www.{domain.domain}"
									target="_blank"
									rel="noopener noreferrer"
									class="text-xs text-blue-600 hover:underline shrink-0"
								>↗ Ver sitio</a>
							{/if}
						</div>
						<div class="flex items-center gap-3 shrink-0">
							<span class="text-xs px-2 py-0.5 rounded-full font-medium {STATUS_BADGE[domain.status] ?? STATUS_BADGE['pending']}">
								{STATUS_LABEL[domain.status] ?? domain.status}
							</span>
							{#if domain.status === 'error' && domain.error_message}
								<span class="text-xs text-red-600 max-w-48 truncate" title={domain.error_message}>
									{domain.error_message}
								</span>
							{/if}
							<button
								onclick={() => askDisconnect(domain.id, domain.domain)}
								class="text-xs text-gray-400 hover:text-red-600 transition-colors"
							>
								Desconectar
							</button>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- ── Wizard ────────────────────────────────────────────────────────── -->
	<section>
		<h2 class="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
			Conectar nuevo dominio
		</h2>

		<div class="bg-white border border-gray-200 rounded-lg p-6 max-w-xl">

			<!-- Step 1: buscar dominio -->
			{#if step === 'search'}
				<div class="space-y-4">
					<p class="text-sm text-gray-600">
						Introduce el dominio que quieres conectar a este proyecto.
					</p>
					<div class="flex gap-2">
						<input
							type="text"
							bind:value={domainInput}
							placeholder="ejemplo.com"
							class="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono"
							onkeydown={(e) => e.key === 'Enter' && checkDomain()}
						/>
						<button
							onclick={checkDomain}
							disabled={checking || !domainInput.trim()}
							class="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{checking ? 'Comprobando…' : 'Verificar'}
						</button>
					</div>

					<!-- Dominio libre: instrucciones de compra manual -->
					{#if available === true}
						<div class="rounded-md bg-amber-50 border border-amber-200 p-4 space-y-4">
							<div>
								<p class="text-sm font-semibold text-amber-900">
									<span class="font-mono">{domainInput.trim()}</span> está disponible
								</p>
								<p class="text-xs text-amber-700 mt-0.5">
									Este dominio aún no ha sido comprado. Cómpralo en el panel de Cloudflare Registrar y vuelve aquí.
								</p>
							</div>
							<ol class="text-xs text-amber-800 space-y-1 list-decimal list-inside">
								<li>Ve a <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" class="underline font-medium">dash.cloudflare.com</a> → Registrar un dominio</li>
								<li>Busca <span class="font-mono font-semibold">{domainInput.trim()}</span> y completa la compra</li>
								<li>Cloudflare tardará ~1 minuto en activar la zona</li>
								<li>Vuelve aquí y pulsa el botón de abajo</li>
							</ol>
							<button
								onclick={() => goToConfirm(true)}
								class="px-4 py-2 text-sm bg-amber-700 text-white rounded-md hover:bg-amber-800 transition-colors"
							>
								Ya lo compré — configurar ahora
							</button>
						</div>
					{/if}

					<!-- Dominio registrado: configurar directamente -->
					{#if available === false}
						<div class="rounded-md bg-green-50 border border-green-200 p-4 space-y-3">
							<div>
								<p class="text-sm font-semibold text-green-900">
									<span class="font-mono">{domainInput.trim()}</span> ya está registrado
								</p>
								<p class="text-xs text-green-700 mt-0.5">
									Si este dominio está en tu cuenta de Cloudflare, puedes configurarlo automáticamente ahora.
								</p>
							</div>
							<button
								onclick={() => goToConfirm(false)}
								class="px-4 py-2 text-sm bg-green-700 text-white rounded-md hover:bg-green-800 transition-colors"
							>
								Conectar y configurar
							</button>
						</div>
					{/if}
				</div>

			<!-- Step 2: confirmar -->
			{:else if step === 'confirm'}
				<div class="space-y-5">
					<div>
						<p class="text-sm text-gray-500 mb-1">Dominio</p>
						<p class="text-base font-mono font-semibold text-gray-900">{domainInput.trim()}</p>
					</div>

					{#if wasAvailable}
						<div class="rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
							<p class="text-xs text-amber-800">
								Se buscará la zona de Cloudflare para este dominio. Si la compra no se completó aún o CF no la procesó todavía, el proceso dará error y podrás reintentarlo.
							</p>
						</div>
					{/if}

					<div>
						<p class="text-sm text-gray-500 mb-2">Se configurará automáticamente:</p>
						<ul class="text-sm text-gray-700 space-y-1">
							<li>✓ Zona Cloudflare para el dominio</li>
							<li>✓ Dominio añadido al proyecto Vercel</li>
							<li>✓ DNS: <span class="font-mono">www</span> y apex → Vercel</li>
							<li>✓ Regla de caché (30 días en edge)</li>
							<li>✓ Redirección 301: <span class="font-mono">{domainInput.trim()}</span> → <span class="font-mono">www.{domainInput.trim()}</span></li>
						</ul>
					</div>
					<div class="flex gap-2 pt-2">
						<button
							onclick={startSetup}
							disabled={submitting}
							class="px-5 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{submitting ? 'Iniciando…' : 'Confirmar configuración'}
						</button>
						<button
							onclick={() => step = 'search'}
							class="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:border-gray-500 transition-colors"
						>
							Atrás
						</button>
					</div>
				</div>

			<!-- Step 3: configurando -->
			{:else if step === 'configuring'}
				<div class="space-y-5">
					<p class="text-sm font-medium text-gray-900">
						Configurando <span class="font-mono">{domainInput.trim()}</span>…
					</p>
					<ul class="space-y-3">
						{#each [
							'Localizando zona en Cloudflare',
							'Registrando en Vercel',
							'Configurando DNS (www y apex)',
							'Aplicando regla de caché (30 días)',
							'Configurando redirección apex → www',
						] as label}
							<li class="flex items-center gap-3 text-sm text-gray-600">
								<span class="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-900 animate-spin shrink-0"></span>
								{label}
							</li>
						{/each}
					</ul>
					<p class="text-xs text-gray-400">
						Este proceso puede tardar entre 30 y 90 segundos. No cierres esta ventana.
					</p>
				</div>

			<!-- Step 4: listo -->
			{:else if step === 'done'}
				<div class="space-y-4">
					<div class="flex items-center gap-3">
						<span class="text-2xl">✅</span>
						<div>
							<p class="text-sm font-semibold text-gray-900">
								{domainInput.trim()} está activo
							</p>
							<a
								href="https://www.{domainInput.trim()}"
								target="_blank"
								rel="noopener noreferrer"
								class="text-sm text-blue-600 hover:underline"
							>
								https://www.{domainInput.trim()} ↗
							</a>
						</div>
					</div>
					<p class="text-xs text-gray-500">
						La propagación DNS puede tardar hasta 24h en completarse globalmente.
						El sitio ya es accesible pero algunos usuarios pueden ver aún la versión anterior.
					</p>
					<button
						onclick={() => location.reload()}
						class="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-700 transition-colors"
					>
						Volver a la lista
					</button>
				</div>

			<!-- Step: error -->
			{:else if step === 'error'}
				<div class="space-y-4">
					<div class="flex items-center gap-3">
						<span class="text-2xl">❌</span>
						<p class="text-sm font-semibold text-red-700">
							Error configurando {domainInput.trim()}
						</p>
					</div>
					<div class="bg-red-50 border border-red-200 rounded-md px-4 py-3">
						<code class="text-xs text-red-700 break-all">{configError}</code>
					</div>
					{#if configError.includes('zona activa')}
						<div class="bg-amber-50 border border-amber-200 rounded-md px-4 py-3">
							<p class="text-xs text-amber-800 font-medium mb-1">¿La compra aún no se procesó?</p>
							<p class="text-xs text-amber-700">
								Cloudflare tarda ~1–2 minutos en activar la zona tras una compra en Registrar.
								Espera un momento y vuelve a intentarlo.
							</p>
						</div>
					{/if}
					<button
						onclick={reset}
						class="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:border-gray-500 transition-colors"
					>
						Intentar de nuevo
					</button>
				</div>
			{/if}

		</div>
	</section>
</div>
