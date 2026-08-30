<script lang="ts">
	import { untrack, onDestroy } from 'svelte';
	import type { PageData } from './$types';
	import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
	import AssetUploadQueue from '$lib/components/AssetUploadQueue.svelte';
	import AssetGrid from '$lib/components/AssetGrid.svelte';
	import { toast } from '$lib/toast.svelte';
	import { pollUntil, type PollHandle } from '$lib/poll';
	import type { Asset } from '$lib/types';

	let { data }: { data: PageData } = $props();

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
	const activePolls = new Set<PollHandle>();
	onDestroy(() => { for (const p of activePolls) p.stop(); });

	// ── Constantes ────────────────────────────────────────────────────────────

	const MAX_CONCURRENT  = 3;
	const VIDEO_CHUNK_SIZE = 8 * 1024 * 1024;   // 8 MB
	const VIDEO_MAX_SIZE   = 500 * 1024 * 1024;  // 500 MB
	const SHARP_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

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

			// Si es imagen, el thumb se genera en background — hacer polling hasta que esté listo
			if (!body.asset.thumb_url && SHARP_TYPES.has(body.asset.mime_type)) {
				pollThumb(body.asset.id);
			}
		} catch {
			item.status = 'error';
			toast('error', `Error subiendo ${item.file.name}`);
		}
	}

	function pollThumb(assetId: string) {
		const handle = pollUntil({
			intervalMs: 2000,
			maxTries:   15, // 30 s máx
			fn: async () => {
				try {
					const res = await fetch(`/api/projects/${project.id}/assets/${assetId}`);
					if (!res.ok) return true;
					const { asset: updated } = await res.json() as { asset: Asset };
					if (updated?.thumb_url) {
						assets = assets.map(a => a.id === assetId ? { ...a, ...updated } : a);
						return true;
					}
					return false;
				} catch { return true; }
			},
		});
		activePolls.add(handle);
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

	const isUploadingVideo = $derived(videoQueue.some(v => v.status === 'uploading'));
</script>

<svelte:head><title>Assets — {project.name}</title></svelte:head>

<div class="space-y-6">

	<!-- Breadcrumb -->
	<div class="flex items-center gap-2 text-sm text-subtle">
		<a href="/dashboard" class="hover:text-ink">Proyectos</a>
		<span>/</span>
		<a href="/projects/{project.id}" class="hover:text-ink">{project.name}</a>
		<span>/</span>
		<span class="text-ink font-medium">Assets</span>
	</div>

	<div class="flex items-center justify-between">
		<h1 class="text-xl font-semibold text-ink">Assets</h1>
		<span class="text-sm text-subtle">{assets.length} archivo{assets.length !== 1 ? 's' : ''}</span>
	</div>

	<!-- Zona de upload -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
			{dragging ? 'border-blue-400 bg-blue-50' : 'border-border-subtle hover:border-border bg-white'}"
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
				<svg class="w-10 h-10 text-border" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"/>
				</svg>
			</div>
			<p class="text-sm text-subtle">
				Arrastra archivos aquí o
				<button
					type="button"
					onclick={() => fileInput.click()}
					class="text-primary hover:text-primary-hover font-medium"
				>selecciona archivos</button>
			</p>
			<p class="text-xs text-faint">JPG, PNG, WebP — máx. 200 MB · Videos — máx. 500 MB (por partes)</p>
		</div>

		<AssetUploadQueue {queue} {videoQueue} onCancelVideo={cancelVideoUpload} />
	</div>

	<!-- Grid de assets -->
	<AssetGrid {assets} onCopyUrl={(asset) => copyUrl(asset.url)} onDelete={askDelete} />
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
