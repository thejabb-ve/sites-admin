<script lang="ts">
	interface Props {
		open:          boolean;
		title?:        string;
		message:       string;
		confirmLabel?: string;
		danger?:       boolean;
		onConfirm:     () => void;
		onCancel?:     () => void;
	}

	let {
		open      = $bindable(false),
		title     = 'Confirmar acción',
		message,
		confirmLabel = 'Confirmar',
		danger    = false,
		onConfirm,
		onCancel,
	}: Props = $props();

	function cancel() {
		open = false;
		onCancel?.();
	}

	function confirm() {
		open = false;
		onConfirm();
	}
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
		role="presentation"
		onclick={cancel}
	></div>

	<!-- Dialog -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
		<div class="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
			<div class="flex items-start gap-3">
				{#if danger}
					<div class="flex-shrink-0 w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
						<svg class="w-5 h-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
						</svg>
					</div>
				{:else}
					<div class="flex-shrink-0 w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center">
						<svg class="w-5 h-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
						</svg>
					</div>
				{/if}
				<div>
					<h2 id="dialog-title" class="text-sm font-semibold text-gray-900">{title}</h2>
					<p class="mt-1 text-sm text-gray-500">{message}</p>
				</div>
			</div>

			<div class="flex gap-2 justify-end pt-2">
				<button
					onclick={cancel}
					class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
				>
					Cancelar
				</button>
				<button
					onclick={confirm}
					class="px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors
						{danger
							? 'bg-red-600 hover:bg-red-700'
							: 'bg-blue-600 hover:bg-blue-700'}"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
