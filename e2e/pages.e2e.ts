import { test, expect, type Page } from '@playwright/test';
import { USER_A } from './global.setup';

const PROJECT_A_ID = '00000000-0000-0000-0000-000000000001';

// Sufijo único por ejecución para evitar conflictos entre runs
const RUN_ID = Date.now().toString(36);

async function login(page: Page) {
	await page.goto('/login');
	await page.fill('input[name="email"]', USER_A.email);
	await page.fill('input[name="password"]', USER_A.password);
	await page.click('button[type="submit"]');
	await expect(page).toHaveURL(/\/dashboard/);
}

async function createPage(page: Page, title: string, slug: string) {
	await page.fill('input[name="title"]', title);
	// Esperar a que el slug se auto-genere antes de sobrescribir
	await page.waitForTimeout(50);
	await page.fill('input[name="slug"]', slug);
	await page.click('button[type="submit"]');
	// Esperar a que la página se actualice
	await page.waitForLoadState('networkidle');
}

test.describe('gestión de páginas', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('navegar a páginas desde el proyecto', async ({ page }) => {
		await page.goto(`/projects/${PROJECT_A_ID}`);
		await page.click('a:has-text("Páginas")');
		await expect(page).toHaveURL(`/projects/${PROJECT_A_ID}/pages`);
	});

	test('crear una página nueva con slug auto-generado', async ({ page }) => {
		await page.goto(`/projects/${PROJECT_A_ID}/pages`);

		await page.fill('input[name="title"]', 'Mi Página');
		// El slug debería auto-actualizarse
		await expect(page.locator('input[name="slug"]')).toHaveValue('mi-pagina');
	});

	test('crear página y verla en el listado', async ({ page }) => {
		await page.goto(`/projects/${PROJECT_A_ID}/pages`);

		const slug = `prueba-${RUN_ID}`;
		await createPage(page, `Página ${RUN_ID}`, slug);

		await expect(page.locator(`text=${slug}`)).toBeVisible();
	});

	test('crear página con slug duplicado muestra error', async ({ page }) => {
		await page.goto(`/projects/${PROJECT_A_ID}/pages`);

		const slug = `dup-${RUN_ID}`;

		// Primera creación
		await createPage(page, `Dup ${RUN_ID}`, slug);
		await expect(page.locator(`text=${slug}`)).toBeVisible();

		// Segunda creación con el mismo slug
		await page.fill('input[name="slug"]', slug);
		await page.fill('input[name="title"]', `Dup ${RUN_ID} bis`);
		// Reescribir el slug porque el title input lo habría sobreescrito
		await page.fill('input[name="slug"]', slug);
		await page.click('button[type="submit"]');

		await expect(page.locator('text=Ya existe una página con ese slug')).toBeVisible();
	});

	test('publicar y despublicar una página', async ({ page }) => {
		await page.goto(`/projects/${PROJECT_A_ID}/pages`);

		const slug = `toggle-${RUN_ID}`;
		await createPage(page, `Toggle ${RUN_ID}`, slug);

		const row = page.locator('div').filter({ hasText: slug }).first();

		// Publicar
		await row.locator('button:has-text("Publicar")').click();
		await page.waitForLoadState('networkidle');
		await expect(row.locator('span:has-text("Publicada")')).toBeVisible();

		// Despublicar
		await row.locator('button:has-text("Despublicar")').click();
		await page.waitForLoadState('networkidle');
		await expect(row.locator('span:has-text("Borrador")')).toBeVisible();
	});

	test('navegar al editor SEO de una página', async ({ page }) => {
		await page.goto(`/projects/${PROJECT_A_ID}/pages`);

		const slug = `seo-nav-${RUN_ID}`;
		await createPage(page, `SEO Nav ${RUN_ID}`, slug);

		await page.locator('a:has-text("SEO")').last().click();
		await expect(page.locator('h1')).toContainText('Metadatos SEO');
	});
});

test.describe('editor de metadatos SEO', () => {
	let pageId: string;

	test.beforeAll(async ({ browser }) => {
		// Crear una página de prueba compartida para este describe
		const ctx  = await browser.newContext();
		const page = await ctx.newPage();
		await login(page);
		await page.goto(`/projects/${PROJECT_A_ID}/pages`);

		const slug = `meta-${RUN_ID}`;
		await createPage(page, `Meta ${RUN_ID}`, slug);

		// Obtener el pageId desde el enlace SEO
		const href = await page.locator('a:has-text("SEO")').last().getAttribute('href');
		pageId = href?.split('/pages/')[1]?.split('/')[0] ?? '';

		await ctx.close();
	});

	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('guardar y persistir metadatos SEO', async ({ page }) => {
		await page.goto(`/projects/${PROJECT_A_ID}/pages/${pageId}/metadata`);

		await page.fill('input[name="seo_title"]', `Título SEO ${RUN_ID}`);
		await page.fill('textarea[name="seo_description"]', 'Descripción de prueba menor a 160 caracteres.');
		await page.selectOption('select[name="robots"]', 'noindex, follow');

		await page.click('button[type="submit"]');
		await expect(page.locator('text=Metadatos guardados correctamente')).toBeVisible();

		// Verificar persistencia tras recarga
		await page.reload();
		await expect(page.locator('input[name="seo_title"]')).toHaveValue(`Título SEO ${RUN_ID}`);
		await expect(page.locator('select[name="robots"]')).toHaveValue('noindex, follow');
	});

	test('el contador cambia a verde con título corto', async ({ page }) => {
		await page.goto(`/projects/${PROJECT_A_ID}/pages/${pageId}/metadata`);

		await page.fill('input[name="seo_title"]', 'Título');
		const counter = page.locator('p').filter({ hasText: '/ 70 caracteres' });
		await expect(counter).toHaveClass(/text-green-600/);
	});

	test('el contador cambia a rojo con título largo', async ({ page }) => {
		await page.goto(`/projects/${PROJECT_A_ID}/pages/${pageId}/metadata`);

		await page.fill('input[name="seo_title"]', 'A'.repeat(95));
		const counter = page.locator('p').filter({ hasText: '/ 70 caracteres' });
		await expect(counter).toHaveClass(/text-red-600/);
	});

	test('robots inválido es rechazado por el servidor', async ({ page }) => {
		await page.goto(`/projects/${PROJECT_A_ID}/pages/${pageId}/metadata`);

		// Manipular el DOM para enviar un valor fuera del select
		await page.evaluate(() => {
			const sel = document.querySelector('select[name="robots"]') as HTMLSelectElement;
			const opt = document.createElement('option');
			opt.value = 'invalid-value';
			opt.text = 'invalid';
			sel.appendChild(opt);
			sel.value = 'invalid-value';
		});

		await page.click('button[type="submit"]');
		await expect(page.locator('text=Valor de robots inválido')).toBeVisible();
	});
});

test.describe('configuración de GA4', () => {
	test.beforeEach(async ({ page }) => {
		await login(page);
	});

	test('guardar un Measurement ID de GA4 válido', async ({ page }) => {
		await page.goto(`/projects/${PROJECT_A_ID}/settings`);

		await page.fill('input[name="ga4_id"]', 'G-ABC123XYZ9');
		await page.click('button[type="submit"]');

		await expect(page.locator('text=Configuración guardada correctamente')).toBeVisible();
		await expect(page.locator('text=Analytics activo')).toBeVisible();
	});

	test('ID de GA4 con formato incorrecto muestra error', async ({ page }) => {
		await page.goto(`/projects/${PROJECT_A_ID}/settings`);

		await page.fill('input[name="ga4_id"]', 'UA-12345');
		await page.click('button[type="submit"]');

		await expect(page.locator('text=formato del ID de Google Analytics')).toBeVisible();
	});

	test('vaciar GA4 desactiva el tracking', async ({ page }) => {
		await page.goto(`/projects/${PROJECT_A_ID}/settings`);

		await page.fill('input[name="ga4_id"]', '');
		await page.click('button[type="submit"]');

		await expect(page.locator('text=Configuración guardada correctamente')).toBeVisible();
		await expect(page.locator('text=Analytics activo')).not.toBeVisible();
	});

	test('el ID guardado persiste al recargar', async ({ page }) => {
		await page.goto(`/projects/${PROJECT_A_ID}/settings`);

		const testId = `G-${RUN_ID.toUpperCase().slice(0, 8)}`;
		await page.fill('input[name="ga4_id"]', testId);
		await page.click('button[type="submit"]');

		await page.reload();
		await expect(page.locator('input[name="ga4_id"]')).toHaveValue(testId);
	});
});
