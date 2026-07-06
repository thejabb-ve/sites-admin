import { test, expect } from '@playwright/test';
import { USER_A } from './global.setup';

test.describe('autenticación', () => {
	test('login con credenciales válidas redirige al dashboard', async ({ page }) => {
		await page.goto('/login');
		await page.fill('input[name="email"]', USER_A.email);
		await page.fill('input[name="password"]', USER_A.password);
		await page.click('button[type="submit"]');
		await expect(page).toHaveURL(/\/dashboard/);
	});

	test('login con contraseña incorrecta muestra error', async ({ page }) => {
		await page.goto('/login');
		await page.fill('input[name="email"]', USER_A.email);
		await page.fill('input[name="password"]', 'contraseña-incorrecta');
		await page.click('button[type="submit"]');
		await expect(page.locator('p')).toContainText('Credenciales inválidas');
	});

	test('ruta protegida sin sesión redirige a /login', async ({ page }) => {
		await page.goto('/dashboard');
		await expect(page).toHaveURL(/\/login/);
	});

	test('logout limpia la sesión y redirige a /login', async ({ page }) => {
		// Login
		await page.goto('/login');
		await page.fill('input[name="email"]', USER_A.email);
		await page.fill('input[name="password"]', USER_A.password);
		await page.click('button[type="submit"]');
		await expect(page).toHaveURL(/\/dashboard/);

		// Logout
		await page.click('button:has-text("Cerrar sesión")');
		await expect(page).toHaveURL(/\/login/);

		// Confirmar que ya no puede acceder al dashboard
		await page.goto('/dashboard');
		await expect(page).toHaveURL(/\/login/);
	});
});
