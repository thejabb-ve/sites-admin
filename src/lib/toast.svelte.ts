export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
	id:      number;
	type:    ToastType;
	message: string;
}

let _toasts = $state<Toast[]>([]);
let _nextId  = 0;

export const toasts = {
	get list() { return _toasts; },
};

export function toast(type: ToastType, message: string, durationMs = 4000) {
	const id = _nextId++;
	_toasts.push({ id, type, message });
	setTimeout(() => dismiss(id), durationMs);
}

export function dismiss(id: number) {
	const i = _toasts.findIndex(t => t.id === id);
	if (i !== -1) _toasts.splice(i, 1);
}
