import { describe, it, expect, beforeEach, mock } from 'bun:test';

// Resend mock — debe declararse antes del import dinámico
const mockEmailsSend = mock(() => Promise.resolve({ data: { id: 'email-test-1' }, error: null }));
mock.module('resend', () => ({
	Resend: class {
		emails = { send: mockEmailsSend };
	},
}));

mock.module('$env/static/private', () => ({
	CLOUDFLARE_API_TOKEN:  'test-cf-token',
	CLOUDFLARE_ACCOUNT_ID: 'test-account-id',
	VERCEL_API_TOKEN:      'test-vercel-token',
	VERCEL_PROJECT_ID:     'test-project-id',
	RESEND_API_KEY:        'test-resend-key',
	RESEND_FROM_EMAIL:     'noreply@agencia.test',
	ALERT_EMAIL:           'alertas@agencia.test',
}));

const { sendEmail } = await import('./email.server');

beforeEach(() => { mockEmailsSend.mockClear(); });

// ── domain_configured ─────────────────────────────────────────────────────────

describe('sendEmail — domain_configured', () => {
	it('llama a resend.emails.send exactamente una vez', async () => {
		await sendEmail({ type: 'domain_configured', domain: 'cliente.com', projectName: 'Mi Proyecto' });
		expect(mockEmailsSend.mock.calls.length).toBe(1);
	});

	it('envía desde RESEND_FROM_EMAIL al ALERT_EMAIL', async () => {
		await sendEmail({ type: 'domain_configured', domain: 'cliente.com', projectName: 'P' });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ from: string; to: string }];
		expect(opts.from).toBe('noreply@agencia.test');
		expect(opts.to).toBe('alertas@agencia.test');
	});

	it('el subject contiene el dominio', async () => {
		await sendEmail({ type: 'domain_configured', domain: 'miweb.io', projectName: 'P' });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ subject: string }];
		expect(opts.subject).toContain('miweb.io');
	});

	it('el HTML contiene el dominio y el nombre del proyecto', async () => {
		await sendEmail({ type: 'domain_configured', domain: 'x.com', projectName: 'Proyecto X' });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ html: string }];
		expect(opts.html).toContain('x.com');
		expect(opts.html).toContain('Proyecto X');
	});

	it('el HTML menciona Cloudflare, Vercel, caché y redirección', async () => {
		await sendEmail({ type: 'domain_configured', domain: 'z.com', projectName: 'Z' });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ html: string }];
		expect(opts.html).toContain('Cloudflare');
		expect(opts.html).toContain('Vercel');
	});
});

// ── domain_error ──────────────────────────────────────────────────────────────

describe('sendEmail — domain_error', () => {
	it('el subject contiene el dominio', async () => {
		await sendEmail({ type: 'domain_error', domain: 'err.com', error: 'Timeout' });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ subject: string }];
		expect(opts.subject).toContain('err.com');
	});

	it('el HTML contiene el mensaje de error', async () => {
		await sendEmail({ type: 'domain_error', domain: 'err.com', error: 'CF zone error: 404' });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ html: string }];
		expect(opts.html).toContain('CF zone error');
	});

	it('escapa HTML en el mensaje de error (previene XSS)', async () => {
		const maliciousError = '<script>alert("xss")</script>';
		await sendEmail({ type: 'domain_error', domain: 'err.com', error: maliciousError });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ html: string }];
		expect(opts.html).not.toContain('<script>');
		expect(opts.html).toContain('&lt;script&gt;');
	});

	it('escapa comillas dobles en el mensaje de error', async () => {
		await sendEmail({ type: 'domain_error', domain: 'err.com', error: 'Error: "credenciales inválidas"' });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ html: string }];
		expect(opts.html).toContain('&quot;');
	});

	it('escapa ampersands en el mensaje de error', async () => {
		await sendEmail({ type: 'domain_error', domain: 'err.com', error: 'A & B failed' });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ html: string }];
		expect(opts.html).toContain('&amp;');
		expect(opts.html).not.toContain('A & B');
	});
});

// ── healthcheck_failure ───────────────────────────────────────────────────────

describe('sendEmail — healthcheck_failure', () => {
	it('el subject contiene el dominio', async () => {
		await sendEmail({ type: 'healthcheck_failure', domain: 'down.com', statusCode: 503 });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ subject: string }];
		expect(opts.subject).toContain('down.com');
	});

	it('el HTML contiene el código HTTP recibido', async () => {
		await sendEmail({ type: 'healthcheck_failure', domain: 'err.com', statusCode: 503 });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ html: string }];
		expect(opts.html).toContain('503');
	});

	it('statusCode null muestra "Sin respuesta (timeout)" en el HTML', async () => {
		await sendEmail({ type: 'healthcheck_failure', domain: 'timeout.com', statusCode: null });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ html: string }];
		expect(opts.html).toContain('timeout');
	});

	it('el HTML menciona el estado de error', async () => {
		await sendEmail({ type: 'healthcheck_failure', domain: 'x.com', statusCode: 500 });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ html: string }];
		expect(opts.html).toContain('error');
	});
});

// ── healthcheck_recovery ──────────────────────────────────────────────────────

describe('sendEmail — healthcheck_recovery', () => {
	it('el subject contiene el dominio', async () => {
		await sendEmail({ type: 'healthcheck_recovery', domain: 'recovered.com' });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ subject: string }];
		expect(opts.subject).toContain('recovered.com');
	});

	it('el HTML contiene el dominio', async () => {
		await sendEmail({ type: 'healthcheck_recovery', domain: 'vuelve.com' });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ html: string }];
		expect(opts.html).toContain('vuelve.com');
	});

	it('el HTML menciona que el sitio está activo de nuevo', async () => {
		await sendEmail({ type: 'healthcheck_recovery', domain: 'up.com' });
		const [opts] = ((mockEmailsSend.mock.calls as unknown as unknown[][])[0]) as unknown as [{ html: string }];
		expect(opts.html.toLowerCase()).toContain('activo');
	});
});

// ── Manejo de errores de Resend ───────────────────────────────────────────────

describe('sendEmail — resiliencia ante fallos de Resend', () => {
	it('no lanza si resend.emails.send rechaza la promesa', async () => {
		mockEmailsSend.mockRejectedValueOnce(new Error('Resend API down') as never);
		await expect(
			sendEmail({ type: 'healthcheck_recovery', domain: 'x.com' }),
		).resolves.toBeUndefined();
	});

	it('no lanza si resend.emails.send lanza excepción síncrona', async () => {
		mockEmailsSend.mockImplementationOnce(() => { throw new Error('Sync error'); });
		await expect(
			sendEmail({ type: 'domain_configured', domain: 'x.com', projectName: 'P' }),
		).resolves.toBeUndefined();
	});

	it('no lanza si resend devuelve error de rate limit', async () => {
		mockEmailsSend.mockResolvedValueOnce({ data: null, error: { name: 'rate_limit_exceeded', message: 'Too many requests' } } as never);
		await expect(
			sendEmail({ type: 'domain_error', domain: 'x.com', error: 'CF error' }),
		).resolves.toBeUndefined();
	});
});
