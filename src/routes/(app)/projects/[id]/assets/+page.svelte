<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageData } from './$types';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import { toast } from '$lib/toast.svelte';

	let { data }: { data: PageData } = $props();

	type Asset = {
		id: string;
		key: string;
		url: string;
		thumb_url: string | null;
		filename: string;
		mime_type: string;
		size_bytes: number | null;
		created_at: string;
	};

	type UploadItem      = { file: File; status: 'uploading' | 'done' | 'error' };
	type VideoUploadItem = { file: File; status: 'uploading' | 'done' | 'error' | 'cancelled'; progress: number };

	const project = $derived(data.project);
	let assets    = $state<Asset[]>(untrack(() => data.assets));
	let queue      = $state<UploadItem[]>([]);
	let videoQueue = $state<VideoUploadItem[]>([]);

	let deleteTarget = $state<Asset | null>(null);
	let confirmOpen  = $state(false);
	let deleting     = $state(false);

	let fileInput: HTMLInputElement;
	let dragging = $state(false);

	let videoAbortCtrl: AbortController | null = null;

	// ── Constantes ────────────────────────────────────────────────────────────

	const MAX_CONCURRENT  = 3;
	const VIDEO_CHUNK_SIZE = 8 * 1024 * 1024;   // 8 MB
	const VIDEO_MAX_SIZE   = 500 * 1024 * 1024;  // 500 MB

	// ── Dispatch de archivos ──────────────────────────────────────────────────

	async function handleFiles(files: FileList | File[]) {
		const all    = Array.from(files);
		const images = all.filter(f => /^image\/(jpeg|jpg|png|webp)$/i.test(f.type));
		const videos = all.filter(f => f.type.startsWith('video/'));

		if (images.length > 0) {
			const items: UploadItem[] = images.map(f => ({ file: f, status: 'uploading' }));
			queue.push(...items);
			for (let i = 0; i < items.length; i += MAX_CONCURRENT) {
				await Promise.all(items.slice(i, i + MAX_CONCURRENT).map(item => uploadOne(item)));
			}
		}

		for (const file of videos) {
			if (file.size > VIDEO_MAX_SIZE) {
				toast('error', `${file.name} supera el límite de 500 MB`);
				continue;
			}
			const item: VideoUploadItem = { file, status: 'uploading', progress: 0 };
			videoQueue.push(item);
			await uploadVideo(item);
		}
	}

	// ── Upload de imágenes ────────────────────────────────────────────────────

	async function uploadOne(item: UploadItem) {
		const form = new FormData();
		form.append('file', item.file);

		try {
			const res  = await fetch(`/api/projects/${project.id}/assets/upload`, { method: 'POST', body: form });
			const body = await res.json();

			if (!res.ok) {
				item.status = 'error';
				toast('error', body.error ?? 'Error subiendo archivo');
				return;
			}

			item.status = 'done';
			assets.unshift(body.asset);
		} catch {
			item.status = 'error';
			toast('error', `Error subiendo ${item.file.name}`);
		}
	}

	// ── Upload de vídeos (multipart) ──────────────────────────────────────────

	async function uploadVideo(item: VideoUploadItem) {
		const ctrl = new AbortController();
		videoAbortCtrl = ctrl;

		try {
			// 1. Ticket de subida
			const ticketRes = await fetch(`/api/projects/${project.id}/assets/video-ticket`, {
				method: 'POST',
				signal: ctrl.signal,
			});
			if (!ticketRes.ok) throw new Error('No se pudo obtener ticket de subida');
			const { cdnUrl, ticket, expires, projectId } = await ticketRes.json() as {
				cdnUrl: string; ticket: string; expires: string; projectId: string;
			};

			const baseHeaders = {
				'X-Upload-Ticket':  ticket,
				'X-Upload-Expires': expires,
				'X-Project-Id':     projectId,
				'X-Filename':       item.file.name,
			};

			// 2. Iniciar multipart en R2
			const initRes = await fetch(`${cdnUrl}/upload-video-init`, {
				method:  'POST',
				headers: { ...baseHeaders, 'Content-Type': item.file.type || 'video/mp4' },
				signal:  ctrl.signal,
			});
			if (!initRes.ok) throw new Error('Error iniciando subida en CDN');
			const { key, uploadId, url } = await initRes.json() as { key: string; uploadId: string; url: string };

			// 3. Subir chunks secuencialmente
			const totalChunks = Math.ceil(item.file.size / VIDEO_CHUNK_SIZE);
			const parts: { partNumber: number; etag: string }[] = [];

			for (let i = 0; i < totalChunks; i++) {
				const chunk   = item.file.slice(i * VIDEO_CHUNK_SIZE, (i + 1) * VIDEO_CHUNK_SIZE);
				const partRes = await fetch(`${cdnUrl}/upload-video-part`, {
					method:  'POST',
					headers: {
						...baseHeaders,
						'Content-Type':  'application/octet-stream',
						'X-Key':         key,
						'X-Upload-Id':   uploadId,
						'X-Part-Number': String(i + 1),
					},
					body:   chunk,
					signal: ctrl.signal,
				});
				if (!partRes.ok) throw new Error(`Error subiendo parte ${i + 1}`);
				const part = await partRes.json() as { etag: string; partNumber: number };
				parts.push({ partNumber: part.partNumber, etag: part.etag });
				item.progress = Math.round(((i + 1) / totalChunks) * 100);
			}

			// 4. Completar multipart (X-Skip-Register: el admin registra en Supabase)
			const completeRes = await fetch(`${cdnUrl}/upload-video-complete`, {
				method:  'POST',
				headers: { ...baseHeaders, 'Content-Type': 'application/json', 'X-Skip-Register': 'true' },
				body:    JSON.stringify({ key, uploadId, parts }),
				signal:  ctrl.signal,
			});
			if (!completeRes.ok) throw new Error('Error completando subida en CDN');

			// 5. Registrar en Supabase vía admin
			const registerRes = await fetch(`/api/projects/${project.id}/assets/register`, {
				method:  'POST',
				headers: { 'Content-Type': 'application/json' },
				body:    JSON.stringify({
					key,
					url,
					filename:   item.file.name,
					size_bytes: item.file.size,
					mime_type:  item.file.type || 'video/mp4',
				}),
			});
			if (!registerRes.ok) throw new Error('Error registrando asset en base de datos');
			const { asset } = await registerRes.json() as { asset: Asset };

			item.status   = 'done';
			item.progress = 100;
			assets.unshift(asset);
		} catch (err) {
			if (ctrl.signal.aborted) {
				item.status = 'cancelled';
			} else {
				item.status = 'error';
				toast('error', `Error subiendo ${item.file.name}: ${err instanceof Error ? err.message : String(err)}`);
			}
		} finally {
			videoAbortCtrl = null;
		}
	}

	function cancelVideoUpload() {
		videoAbortCtrl?.abort();
		videoAbortCtrl = null;
	}

	// ── Eventos de archivo ────────────────────────────────────────────────────

	function onFileInput(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		if (input.files?.length) handleFiles(input.files);
		input.value = '';
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		if (e.dataTransfer?.files?.length) handleFiles(e.dataTransfer.files);
	}

	// ── Copy URL ──────────────────────────────────────────────────────────────

	async function copyUrl(url: string) {
		await navigator.clipboard.writeText(url);
		toast('info', 'URL copiada al portapapeles');
	}

	// ── Delete ────────────────────────────────────────────────────────────────

	function askDelete(asset: Asset) {
		deleteTarget = asset;
		confirmOpen  = true;
	}

	async function confirmDelete() {
		if (!deleteTarget) return;
		deleting = true;
		try {
			const res = await fetch(
				`/api/projects/${project.id}/assets/${deleteTarget.id}`,
				{ method: 'DELETE' },
			);
			if (!res.ok) {
				const body = await res.json();
				toast('error', body.error ?? 'Error eliminando asset');
				return;
			}
			assets   = assets.filter(a => a.id !== deleteTarget!.id);
			toast('success', 'Asset eliminado');
		} catch {
			toast('error', 'Error de conexión al eliminar');
		} finally {
			deleting     = false;
			deleteTarget = null;
		}
	}

	// ── Helpers ───────────────────────────────────────────────────────────────

	function formatBytes(bytes: number | null): string {
		if (!bytes) return '';
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	const isUploadingVideo = $derived(videoQueue.some(v => v.status === 'uploading'));
</script>

<svelte:head><title>Assets — {project.name}</title></svelte:head>

<div class="space-y-6">

	<!-- Breadcrumb -->
	<div class="flex items-center gap-2 text-sm text-gray-500">
		<a href="/dashboard" class="hover:text-gray-900">Proyectos</a>
		<span>/</span>
		<a href="/projects/{project.id}" class="hover:text-gray-900">{project.name}</a>
		<span>/</span>
		<span class="text-gray-900 font-medium">Assets</span>
	</div>

	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold text-gray-900">Assets</h1>
		<span class="text-sm text-gray-500">{assets.length} archivo{assets.length !== 1 ? 's' : ''}</span>
	</div>

	<!-- Zona de upload -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative border-2 border-dashed rounded-xl p-8 text-center transition-colors
			{dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}"
		ondragover={(e) => { e.preventDefault(); dragging = true; }}
		ondragleave={() => (dragging = false)}
		ondrop={onDrop}
	>
		<input
			bind:this={fileInput}
			type="file"
			multiple
			accept="image/jpeg,image/jpg,image/png,image/webp,video/*"
			class="hidden"
			onchange={onFileInput}
		/>

		<div class="space-y-2">
			<div class="flex justify-center">
				<svg class="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/>
				</svg>
			</div>
			<p class="text-sm text-gray-500">
				Arrastra archivos aquí o
				<button
					type="button"
					onclick={() => fileInput.click()}
					class="text-blue-600 hover:text-blue-700 font-medium"
				>selecciona archivos</button>
			</p>
			<p class="text-xs text-gray-400">JPG, PNG, WebP — máx. 200 MB · Videos — máx. 500 MB (por partes)</p>
		</div>

		<!-- Cola de imágenes -->
		{#if queue.length > 0}
			<div class="mt-4 space-y-1 text-left max-w-sm mx-auto">
				{#each queue as item (item.file.name + item.file.size)}
					<div class="flex items-center gap-2 text-xs">
						{#if item.status === 'uploading'}
							<span class="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0"></span>
						{:else if item.status === 'done'}
							<span class="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></span>
						{:else}
							<span class="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></span>
						{/if}
						<span class="truncate text-gray-600">{item.file.name}</span>
						<span class="ml-auto text-gray-400 flex-shrink-0">
							{item.status === 'uploading' ? 'Subiendo…' : item.status === 'done' ? '✓' : '✗'}
						</span>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Cola de vídeos con progreso -->
		{#if videoQueue.length > 0}
			<div class="mt-4 space-y-2 text-left max-w-sm mx-auto">
				{#each videoQueue as item (item.file.name + item.file.size)}
					<div class="text-xs space-y-1">
						<div class="flex items-center gap-2">
							{#if item.status === 'uploading'}
								<span class="w-2 h-2 rounded-full bg-purple-400 animate-pulse flex-shrink-0"></span>
							{:else if item.status === 'done'}
								<span class="w-2 h-2 rounded-full bg-green-400 flex-shrink-0"></span>
							{:else if item.status === 'cancelled'}
								<span class="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0"></span>
							{:else}
								<span class="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></span>
							{/if}
							<span class="truncate text-gray-600">{item.file.name}</span>
							<span class="ml-auto text-gray-400 flex-shrink-0">
								{#if item.status === 'uploading'}
									{item.progress}%
								{:else if item.status === 'done'}
									✓
								{:else if item.status === 'cancelled'}
									Cancelado
								{:else}
									✗
								{/if}
							</span>
						</div>
						{#if item.status === 'uploading'}
							<div class="flex items-center gap-2">
								<div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
									<div
										class="h-full bg-purple-500 rounded-full transition-all duration-300"
										style="width: {item.progress}%"
									></div>
								</div>
								<button
									type="button"
									onclick={cancelVideoUpload}
									class="text-[10px] text-red-500 hover:text-red-700 font-medium flex-shrink-0"
								>Cancelar</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Grid de assets -->
	{#if assets.length === 0}
		<div class="text-center py-16 text-gray-400">
			<svg class="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/>
			</svg>
			<p class="text-sm">Sube imágenes o vídeos para este proyecto</p>
		</div>
	{:else}
		<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
			{#each assets as asset (asset.id)}
				<div class="group relative rounded-lg overflow-hidden aspect-square
					{asset.mime_type.startsWith('video/') ? 'bg-gray-900' : 'bg-gray-100'}">

					{#if asset.mime_type.startsWith('video/')}
						<!-- Tarjeta de vídeo -->
						<div class="w-full h-full flex flex-col items-center justify-center gap-1.5">
							<svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
								<path stroke-linecap="round" stroke-linejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"/>
							</svg>
							<span class="text-[10px] text-gray-500 px-2 text-center truncate w-full leading-tight">
								{asset.filename}
							</span>
						</div>
					{:else}
						<!-- Tarjeta de imagen -->
						<img
							src={asset.thumb_url ?? asset.url}
							alt={asset.filename}
							class="w-full h-full object-cover"
							loading="lazy"
							referrerpolicy="no-referrer"
						/>
						<!-- Badge procesando -->
						{#if !asset.thumb_url}
							<div class="absolute top-1.5 left-1.5">
								<span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 text-amber-700 rounded-full">
									<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
									Procesando
								</span>
							</div>
						{/if}
					{/if}

					<!-- Overlay en hover -->
					<div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
						<p class="text-white text-[10px] font-medium truncate leading-tight">
							{asset.filename}
						</p>
						{#if asset.size_bytes}
							<p class="text-white/60 text-[10px]">{formatBytes(asset.size_bytes)}</p>
						{/if}
						<div class="flex gap-1.5 mt-auto">
							<button
								type="button"
								onclick={() => copyUrl(asset.url)}
								title="Copiar URL"
								class="flex-1 py-1 text-[10px] font-medium bg-white/20 hover:bg-white/30 text-white rounded transition-colors"
							>
								Copiar URL
							</button>
							<button
								type="button"
								onclick={() => askDelete(asset)}
								title="Eliminar"
								class="py-1 px-2 text-[10px] font-medium bg-red-500/80 hover:bg-red-500 text-white rounded transition-colors"
							>
								✕
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Confirm delete -->
<ConfirmDialog
	bind:open={confirmOpen}
	title="Eliminar asset"
	message="Se eliminarán todas las variantes ({deleteTarget?.filename}). Esta acción no se puede deshacer."
	confirmLabel={deleting ? 'Eliminando…' : 'Eliminar'}
	danger
	onConfirm={confirmDelete}
	onCancel={() => (deleteTarget = null)}
/>
