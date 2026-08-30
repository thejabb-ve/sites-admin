import { describe, it, expect, mock, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup } from '@testing-library/svelte';

afterEach(() => cleanup());
import AssetGrid from './AssetGrid.svelte';
import type { Asset } from '$lib/types';

const IMAGE_ASSET: Asset = {
	id:         'asset-1',
	key:        'projects/1/imagen.webp',
	url:        'https://cdn.test/projects/1/imagen.webp',
	thumb_url:  'https://cdn.test/projects/1/imagen-thumb.webp',
	filename:   'imagen.webp',
	mime_type:  'image/webp',
	size_bytes: 12345,
	created_at: '2026-01-01T00:00:00Z',
};

const VIDEO_ASSET: Asset = {
	id:         'asset-2',
	key:        'projects/1/video.mp4',
	url:        'https://cdn.test/projects/1/video.mp4',
	thumb_url:  null,
	filename:   'video.mp4',
	mime_type:  'video/mp4',
	size_bytes: 99999,
	created_at: '2026-01-02T00:00:00Z',
};

const ASSETS = [IMAGE_ASSET, VIDEO_ASSET];

describe('AssetGrid — renderizado', () => {
	it('renderiza una tarjeta por cada asset', () => {
		const { container } = render(AssetGrid, {
			props: { assets: ASSETS, onCopyUrl: () => {}, onDelete: () => {} },
		});
		expect(container.querySelectorAll('img').length + 1).toBe(2); // 1 imagen + 1 tarjeta de vídeo (sin img)
	});

	it('renderiza <img> con loading="lazy" y referrerpolicy="no-referrer"', () => {
		const { container } = render(AssetGrid, {
			props: { assets: [IMAGE_ASSET], onCopyUrl: () => {}, onDelete: () => {} },
		});
		const img = container.querySelector('img');
		expect(img).toBeTruthy();
		expect(img?.getAttribute('loading')).toBe('lazy');
		expect(img?.getAttribute('referrerpolicy')).toBe('no-referrer');
	});

	it('tarjeta de vídeo no renderiza <img>, muestra el nombre del archivo', () => {
		const { container } = render(AssetGrid, {
			props: { assets: [VIDEO_ASSET], onCopyUrl: () => {}, onDelete: () => {} },
		});
		expect(container.querySelector('img')).toBeFalsy();
		expect(screen.getByText('video.mp4')).toBeTruthy();
	});

	it('estado vacío (assets=[]) no rompe y muestra mensaje', () => {
		render(AssetGrid, { props: { assets: [], onCopyUrl: () => {}, onDelete: () => {} } });
		expect(screen.getByText('Sube imágenes o vídeos para este proyecto')).toBeTruthy();
	});
});

describe('AssetGrid — callbacks', () => {
	it('click en "URL" dispara onCopyUrl con el asset correcto', async () => {
		const onCopyUrl = mock(() => {});
		render(AssetGrid, {
			props: { assets: ASSETS, onCopyUrl, onDelete: () => {} },
		});

		const buttons = screen.getAllByTitle('Copiar URL');
		await fireEvent.click(buttons[0]!);

		expect(onCopyUrl).toHaveBeenCalledTimes(1);
		const [asset] = onCopyUrl.mock.calls[0] as unknown as [Asset];
		expect(asset).toEqual(IMAGE_ASSET);
	});

	it('click en "✕" dispara onDelete con el asset correcto', async () => {
		const onDelete = mock(() => {});
		render(AssetGrid, {
			props: { assets: ASSETS, onCopyUrl: () => {}, onDelete },
		});

		const buttons = screen.getAllByTitle('Eliminar');
		await fireEvent.click(buttons[1]!);

		expect(onDelete).toHaveBeenCalledTimes(1);
		const [asset] = onDelete.mock.calls[0] as unknown as [Asset];
		expect(asset).toEqual(VIDEO_ASSET);
	});
});
