import { test, expect } from '@playwright/test';
import { USER_A, USER_B } from './global.setup';

const PROJECT_A_ID = '00000000-0000-0000-0000-000000000001';
const PROJECT_B_ID = '00000000-0000-0000-0000-000000000002';

async function loginAs(
	page: import('@playwright/test').Page,
	email: string,
	password: string
) {
	await page.goto('/login');
	await page.fill('input[name="email"]', email);
	await page.fill('input[name="password"]', password);
	await page.click('button[type="submit"]');
	await page.waitForURL(/\/dashboard/);
}

test.describe('aislamiento multi-inquilino', () => {
	test('usuario A ve proyecto A en dashboard y no ve proyecto B', async ({ page }) => {
		await loginAs(page, USER_A.email, USER_A.password);

		// Proyecto A debe aparecer
		await expect(page.locator(`a[href="/projects/${PROJECT_A_ID}"]`)).toBeVisible();

		// Proyecto B NO debe aparecer
		await expect(page.locator(`a[href="/projects/${PROJECT_B_ID}"]`)).not.toBeVisible();
	});

	test('usuario B ve proyecto B en dashboard y no ve proyecto A', async ({ page }) => {
		await loginAs(page, USER_B.email, USER_B.password);

		await expect(page.locator(`a[href="/projects/${PROJECT_B_ID}"]`)).toBeVisible();
		await expect(page.locator(`a[href="/projects/${PROJECT_A_ID}"]`)).not.toBeVisible();
	});

	test('usuario A recibe 404 al intentar acceder directamente al proyecto B', async ({ page }) => {
		await loginAs(page, USER_A.email, USER_A.password);

		await page.goto(`/projects/${PROJECT_B_ID}`);

		// RLS devuelve null → +page.server.ts lanza error(404)
		await expect(page.locator('body')).toContainText('404');
	});

	test('usuario B recibe 404 al intentar acceder directamente al proyecto A', async ({ page }) => {
		await loginAs(page, USER_B.email, USER_B.password);

		await page.goto(`/projects/${PROJECT_A_ID}`);
		await expect(page.locator('body')).toContainText('404');
	});

	test('usuario A ve el detalle completo de proyecto A (dominios y miembros)', async ({ page }) => {
		await loginAs(page, USER_A.email, USER_A.password);

		await page.goto(`/projects/${PROJECT_A_ID}`);
		await expect(page).toHaveURL(`/projects/${PROJECT_A_ID}`);
		await expect(page.locator('h1')).toContainText('Proyecto A');
	});
});
