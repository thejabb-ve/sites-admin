<script lang="ts">
	type UploadItem      = { file: File; status: 'uploading' | 'done' | 'error' };
	type VideoUploadItem = { file: File; status: 'uploading' | 'done' | 'error' | 'cancelled'; progress: number };

	interface Props {
		queue: UploadItem[];
		videoQueue: VideoUploadItem[];
		onCancelVideo: () => void;
	}

	let { queue, videoQueue, onCancelVideo }: Props = $props();
</script>

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
				<span class="truncate text-muted">{item.file.name}</span>
				<span class="ml-auto text-faint flex-shrink-0">
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
						<span class="w-2 h-2 rounded-full bg-faint flex-shrink-0"></span>
					{:else}
						<span class="w-2 h-2 rounded-full bg-red-400 flex-shrink-0"></span>
					{/if}
					<span class="truncate text-muted">{item.file.name}</span>
					<span class="ml-auto text-faint flex-shrink-0">
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
						<div class="flex-1 h-1.5 bg-surface-muted-strong rounded-full overflow-hidden">
							<div
								class="h-full bg-purple-500 rounded-full transition-all duration-300"
								style="width: {item.progress}%"
							></div>
						</div>
						<button
							type="button"
							onclick={onCancelVideo}
							class="text-[10px] text-danger hover:text-danger-hover font-medium flex-shrink-0"
						>Cancelar</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}
