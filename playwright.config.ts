import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	webServer: {
		command: 'bun run build && bun run preview',
		port: 4173,
		reuseExistingServer: !process.env.CI
	},
	use: {
		baseURL: 'http://localhost:4173'
	},
	projects: [
		{ name: 'setup', testMatch: /global\.setup\.ts/ },
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			dependencies: ['setup']
		}
	],
	testDir: 'e2e',
	testMatch: '**/*.e2e.{ts,js}'
});
