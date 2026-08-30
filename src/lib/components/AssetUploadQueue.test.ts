import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

afterEach(() => cleanup());
import AssetUploadQueue from './AssetUploadQueue.svelte';

type UploadItem      = { file: File; status: 'uploading' | 'done' | 'error' };
type VideoUploadItem = { file: File; status: 'uploading' | 'done' | 'error' | 'cancelled'; progress: number };

function fakeFile(name: string, size = 100): File {
	return new File([new Uint8Array(size)], name);
}

describe('AssetUploadQueue — cola de imágenes', () => {
	it('renderiza un item por cada elemento de queue', () => {
		const queue: UploadItem[] = [
			{ file: fakeFile('a.jpg'), status: 'uploading' },
			{ file: fakeFile('b.jpg'), status: 'done' },
		];
		render(AssetUploadQueue, {
			props: { queue, videoQueue: [], onCancelVideo: () => {} },
		});
		expect(screen.getByText('a.jpg')).toBeTruthy();
		expect(screen.getByText('b.jpg')).toBeTruthy();
	});

	it('muestra el estado "Subiendo…" y "✓" según status', () => {
		const queue: UploadItem[] = [
			{ file: fakeFile('a.jpg'), status: 'uploading' },
			{ file: fakeFile('b.jpg'), status: 'done' },
			{ file: fakeFile('c.jpg'), status: 'error' },
		];
		render(AssetUploadQueue, {
			props: { queue, videoQueue: [], onCancelVideo: () => {} },
		});
		expect(screen.getByText('Subiendo…')).toBeTruthy();
		expect(screen.getByText('✓')).toBeTruthy();
		expect(screen.getByText('✗')).toBeTruthy();
	});

	it('cola de imágenes vacía no rompe y no renderiza nada', () => {
		const { container } = render(AssetUploadQueue, {
			props: { queue: [], videoQueue: [], onCancelVideo: () => {} },
		});
		expect(container.textContent?.trim()).toBe('');
	});
});

describe('AssetUploadQueue — cola de vídeos', () => {
	it('renderiza un item por cada elemento de videoQueue con su progreso', () => {
		const videoQueue: VideoUploadItem[] = [
			{ file: fakeFile('video1.mp4'), status: 'uploading', progress: 42 },
		];
		render(AssetUploadQueue, {
			props: { queue: [], videoQueue, onCancelVideo: () => {} },
		});
		expect(screen.getByText('video1.mp4')).toBeTruthy();
		expect(screen.getByText('42%')).toBeTruthy();
	});

	it('muestra "Cancelado" para vídeos con status cancelled', () => {
		const videoQueue: VideoUploadItem[] = [
			{ file: fakeFile('video2.mp4'), status: 'cancelled', progress: 0 },
		];
		render(AssetUploadQueue, {
			props: { queue: [], videoQueue, onCancelVideo: () => {} },
		});
		expect(screen.getByText('Cancelado')).toBeTruthy();
	});

	it('click en "Cancelar" dispara onCancelVideo', async () => {
		const onCancelVideo = mock(() => {});
		const videoQueue: VideoUploadItem[] = [
			{ file: fakeFile('video3.mp4'), status: 'uploading', progress: 10 },
		];
		render(AssetUploadQueue, {
			props: { queue: [], videoQueue, onCancelVideo },
		});

		await fireEvent.click(screen.getByText('Cancelar'));

		expect(onCancelVideo).toHaveBeenCalledTimes(1);
	});

	it('no muestra botón "Cancelar" para vídeos que no están en uploading', () => {
		const videoQueue: VideoUploadItem[] = [
			{ file: fakeFile('video4.mp4'), status: 'done', progress: 100 },
		];
		render(AssetUploadQueue, {
			props: { queue: [], videoQueue, onCancelVideo: () => {} },
		});
		expect(screen.queryByText('Cancelar')).toBeFalsy();
	});

	it('cola de vídeos vacía no rompe y no renderiza nada', () => {
		const { container } = render(AssetUploadQueue, {
			props: { queue: [], videoQueue: [], onCancelVideo: () => {} },
		});
		expect(container.textContent?.trim()).toBe('');
	});
});
