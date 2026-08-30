<script lang="ts">
	import Button from './Button.svelte';

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
						<svg class="w-5 h-5 text-danger" viewBox="0 0 20 20" fill="currentColor">
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
					<h2 id="dialog-title" class="text-sm font-semibold text-ink">{title}</h2>
					<p class="mt-1 text-sm text-subtle">{message}</p>
				</div>
			</div>

			<div class="flex gap-2 justify-end pt-2">
				<Button variant="secondary" onclick={cancel}>Cancelar</Button>
				<Button variant={danger ? 'danger' : 'primary'} onclick={confirm}>{confirmLabel}</Button>
			</div>
		</div>
	</div>
{/if}
