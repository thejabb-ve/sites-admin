import { plugin } from 'bun';
import { mock } from 'bun:test';
import { compile, compileModule } from 'svelte/compiler';
import { readFileSync } from 'fs';
import { GlobalRegistrator } from '@happy-dom/global-registrator';

GlobalRegistrator.register();

// $app/state es un módulo virtual que solo existe vía el plugin de Vite de SvelteKit —
// bun test no lo resuelve. Mock mínimo para componentes que solo leen page.params/page.url.
mock.module('$app/state', () => ({
	page: {
		params: {},
		url:    new URL('http://localhost/'),
		data:   {},
		status: 200,
		error:  null,
		form:   null,
	},
}));

// $env/static/* también son módulos virtuales de Vite — sin esto, cada test.ts
// tenía que mockearlos por su cuenta con subconjuntos de claves distintos, y al
// correr toda la suite junta (bun test src) el último mock.module registrado
// para el mismo specifier ganaba globalmente, dejando sin claves a los demás
// archivos. Centralizarlo aquí (preload, se ejecuta una sola vez) evita la
// colisión. Los valores coinciden con los que ya usaban los tests individuales.
mock.module('$env/static/private', () => ({
	CLOUDFLARE_API_TOKEN:      'test-cf-token',
	CLOUDFLARE_ACCOUNT_ID:     'test-account-id',
	VERCEL_API_TOKEN:          'test-vercel-token',
	VERCEL_PROJECT_ID:         'test-project-id',
	RESEND_API_KEY:            'test-resend-key',
	RESEND_FROM_EMAIL:         'noreply@agencia.test',
	ALERT_EMAIL:               'alertas@agencia.test',
	CDN_WORKER_URL:            'https://cdn.test',
	CDN_UPLOAD_SECRET:         'test-secret',
	SUPABASE_SERVICE_ROLE_KEY: 'svc-key',
	JWT_SECRET:                'test-jwt-secret',
}));
mock.module('$env/static/public', () => ({
	PUBLIC_SUPABASE_URL:      'https://supabase.test',
	PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
}));

// $app/forms es otro módulo virtual de Vite/SvelteKit — bun test tampoco lo resuelve.
// Mock de `enhance` que intercepta el submit, invoca la submit function del componente
// (ignorando sus argumentos, como hacen los componentes reales: `use:enhance={() => async (...) => {...}}`)
// y luego llama al callback devuelto con un ActionResult controlable por test vía
// `globalThis.__mockActionResult` (default: éxito). Así se puede probar el flujo completo
// de use:enhance sin un servidor real.
mock.module('$app/forms', () => ({
	enhance: (form: HTMLFormElement, submitFunction?: (...args: unknown[]) => unknown) => {
		const handler = async (e: Event) => {
			e.preventDefault();
			const action = new URL(form.getAttribute('action') ?? '', 'http://localhost/');
			const callback = await submitFunction?.({
				action,
				cancel:      () => {},
				formData:    new FormData(form),
				formElement: form,
				submitter:   null,
			});
			if (typeof callback === 'function') {
				const result = (globalThis as { __mockActionResult?: unknown }).__mockActionResult
					?? { type: 'success', status: 200 };
				await callback({
					result,
					update:      async () => {},
					formElement: form,
					formData:    new FormData(form),
					action,
				});
			}
		};
		form.addEventListener('submit', handler);
		return { destroy: () => form.removeEventListener('submit', handler) };
	},
}));

const SVELTE_CLIENT = new URL(
	'../../node_modules/svelte/src/index-client.js',
	import.meta.url,
).pathname;

plugin({
	name: 'svelte loader',
	setup(builder) {
		builder.onLoad({ filter: /svelte\/src\/index-server\.js$/ }, () => ({
			contents: `export * from ${JSON.stringify(SVELTE_CLIENT)}`,
			loader: 'js',
		}));

		builder.onLoad({ filter: /\.svelte$/ }, ({ path }) => {
			const source = readFileSync(path, 'utf-8');
			const result = compile(source, {
				filename: path,
				generate: 'client',
				dev: false,
			});
			return { contents: result.js.code, loader: 'js' };
		});

		builder.onLoad({ filter: /\.svelte\.[jt]s$/ }, ({ path }) => {
			const raw = readFileSync(path, 'utf-8');
			// compileModule espera JS ya despojado de anotaciones TS (interfaces, tipos, etc.) —
			// a diferencia de compile() para .svelte, no hace su propio stripping de TypeScript.
			// Sin esto, cualquier .svelte.ts con sintaxis TS (interfaces, `: Type`) revienta con
			// js_parse_error.
			const source = path.endsWith('.ts')
				? new Bun.Transpiler({ loader: 'ts' }).transformSync(raw)
				: raw;
			const result = compileModule(source, {
				filename: path,
				generate: 'client',
				dev: false,
			});
			return { contents: result.js.code, loader: 'js' };
		});
	},
});
