import { describe, it, expect, mock, spyOn, afterEach } from 'bun:test';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/svelte';

afterEach(() => cleanup());
import AssetPicker from './AssetPicker.svelte';
import type { Asset } from '$lib/types';

const ASSET_A: Asset = {
	id:         'asset-a',
	key:        'projects/1/a.webp',
	url:        'https://cdn.test/projects/1/a.webp',
	thumb_url:  'https://cdn.test/projects/1/a-thumb.webp',
	filename:   'a.webp',
	mime_type:  'image/webp',
	size_bytes: 1000,
	created_at: '2026-01-01T00:00:00Z',
};

const ASSET_B: Asset = {
	id:         'asset-b',
	key:        'projects/1/b.webp',
	url:        'https://cdn.test/projects/1/b.webp',
	thumb_url:  null,
	filename:   'b.webp',
	mime_type:  'image/webp',
	size_bytes: 2000,
	created_at: '2026-01-02T00:00:00Z',
};

function mockFetchAssets(assets: Asset[]) {
	return spyOn(globalThis, 'fetch').mockImplementation((() =>
		Promise.resolve(new Response(JSON.stringify(assets), { status: 200 }))
	) as never);
}

describe('AssetPicker — modal', () => {
	it('no muestra el modal inicialmente', () => {
		mockFetchAssets([]);
		render(AssetPicker, { props: { value: '', onSelect: () => {} } });
		expect(screen.queryByText('Seleccionar imagen')).toBeFalsy();
	});

	it('click en "Seleccionar" abre el modal y hace fetch de assets', async () => {
		const fetchSpy = mockFetchAssets([ASSET_A]);
		render(AssetPicker, { props: { value: '', onSelect: () => {} } });

		await fireEvent.click(screen.getByText('Seleccionar'));

		expect(fetchSpy).toHaveBeenCalledTimes(1);
		const [url] = (fetchSpy.mock.calls as unknown[][])[0] as [string];
		expect(url).toContain('/assets');

		await waitFor(() => {
			expect(screen.getByText('Seleccionar imagen')).toBeTruthy();
		});
	});

	it('con value existente, el botón dice "Cambiar" y muestra preview con referrerpolicy', () => {
		mockFetchAssets([]);
		const { container } = render(AssetPicker, {
			props: { value: 'https://cdn.test/x.webp', onSelect: () => {} },
		});
		expect(screen.getByText('Cambiar')).toBeTruthy();
		const preview = container.querySelector('img');
		expect(preview?.getAttribute('referrerpolicy')).toBe('no-referrer');
	});

	it('click en "Cerrar" (✕) cierra el modal', async () => {
		mockFetchAssets([ASSET_A]);
		render(AssetPicker, { props: { value: '', onSelect: () => {} } });

		await fireEvent.click(screen.getByText('Seleccionar'));
		await waitFor(() => expect(screen.getByText('Seleccionar imagen')).toBeTruthy());

		await fireEvent.click(screen.getByLabelText('Cerrar', { selector: 'button' }));

		expect(screen.queryByText('Seleccionar imagen')).toBeFalsy();
	});

	it('sin assets, muestra mensaje de "no tiene imágenes cargadas"', async () => {
		mockFetchAssets([]);
		render(AssetPicker, { props: { value: '', onSelect: () => {} } });

		await fireEvent.click(screen.getByText('Seleccionar'));

		await waitFor(() => {
			expect(screen.getByText('Este proyecto no tiene imágenes cargadas todavía.')).toBeTruthy();
		});
	});
});

describe('AssetPicker — selección', () => {
	it('click en un asset del grid dispara onSelect con su url y cierra el modal', async () => {
		mockFetchAssets([ASSET_A, ASSET_B]);
		const onSelect = mock(() => {});
		render(AssetPicker, { props: { value: '', onSelect } });

		await fireEvent.click(screen.getByText('Seleccionar'));
		await waitFor(() => expect(screen.getByTitle('a.webp')).toBeTruthy());

		await fireEvent.click(screen.getByTitle('b.webp'));

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect((onSelect.mock.calls as unknown[][])[0][0]).toBe(ASSET_B.url);
		expect(screen.queryByText('Seleccionar imagen')).toBeFalsy();
	});

	it('las imágenes del grid tienen loading="lazy" y referrerpolicy="no-referrer"', async () => {
		mockFetchAssets([ASSET_A]);
		render(AssetPicker, { props: { value: '', onSelect: () => {} } });

		await fireEvent.click(screen.getByText('Seleccionar'));
		await waitFor(() => expect(screen.getByTitle('a.webp')).toBeTruthy());

		const gridImg = screen.getByTitle('a.webp').querySelector('img');
		expect(gridImg?.getAttribute('loading')).toBe('lazy');
		expect(gridImg?.getAttribute('referrerpolicy')).toBe('no-referrer');
	});
});
