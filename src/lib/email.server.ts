import { Resend } from 'resend';
import { RESEND_API_KEY, RESEND_FROM_EMAIL, ALERT_EMAIL } from '$env/static/private';

const resend = new Resend(RESEND_API_KEY);

// ── Tipos ─────────────────────────────────────────────────────────────────────

type EmailTemplate =
	| { type: 'domain_configured'; domain: string; projectName: string }
	| { type: 'domain_error';      domain: string; error: string }
	| { type: 'healthcheck_failure'; domain: string; statusCode: number | null }
	| { type: 'healthcheck_recovery'; domain: string };

// ── Función principal ─────────────────────────────────────────────────────────

export async function sendEmail(template: EmailTemplate): Promise<void> {
	const { subject, html } = buildEmail(template);
	try {
		await resend.emails.send({
			from:    RESEND_FROM_EMAIL,
			to:      ALERT_EMAIL,
			subject,
			html,
		});
	} catch (err) {
		// Never throw — el email es una notificación, no debe interrumpir el flujo
		console.error('[email] Error enviando notificación:', err);
	}
}

// ── Templates ─────────────────────────────────────────────────────────────────

function buildEmail(template: EmailTemplate): { subject: string; html: string } {
	switch (template.type) {
		case 'domain_configured':
			return {
				subject: `✅ Dominio configurado: ${template.domain}`,
				html: layout(`
					<h2>Dominio configurado correctamente</h2>
					<p>El dominio <strong>${template.domain}</strong> del proyecto
					<strong>${template.projectName}</strong> ha sido configurado y ya está activo.</p>
					<ul>
						<li>Zona Cloudflare creada</li>
						<li>Dominio añadido a Vercel</li>
						<li>Reglas de caché aplicadas</li>
						<li>Redirección apex → www activa</li>
					</ul>
					<p>El sitio está disponible en:
					<a href="https://www.${template.domain}">https://www.${template.domain}</a></p>
					<p style="color:#6b7280;font-size:13px;">
						Nota: la propagación DNS puede tardar hasta 24h en completarse globalmente.
					</p>
				`),
			};

		case 'domain_error':
			return {
				subject: `❌ Error configurando dominio: ${template.domain}`,
				html: layout(`
					<h2>Error en la configuración del dominio</h2>
					<p>Ocurrió un error al configurar <strong>${template.domain}</strong>.</p>
					<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px 16px;margin:16px 0;">
						<code style="color:#dc2626;font-size:13px;">${escHtml(template.error)}</code>
					</div>
					<p>Revisa el estado del dominio en el panel admin y vuelve a intentarlo,
					o contacta soporte si el error persiste.</p>
				`),
			};

		case 'healthcheck_failure':
			return {
				subject: `⚠️ Sitio sin respuesta: ${template.domain}`,
				html: layout(`
					<h2>Alerta: sitio sin respuesta</h2>
					<p>El dominio <strong>${template.domain}</strong> no respondió correctamente
					durante el healthcheck periódico.</p>
					<p>Código HTTP recibido:
					<strong style="color:#dc2626;">
						${template.statusCode !== null ? template.statusCode : 'Sin respuesta (timeout)'}
					</strong></p>
					<p>El estado del dominio se ha marcado como <strong>error</strong> en el panel admin.
					Revisa el servidor y la configuración DNS.</p>
				`),
			};

		case 'healthcheck_recovery':
			return {
				subject: `✅ Sitio recuperado: ${template.domain}`,
				html: layout(`
					<h2>Sitio operativo de nuevo</h2>
					<p>El dominio <strong>${template.domain}</strong> vuelve a responder correctamente.</p>
					<p>El estado se ha actualizado a <strong>activo</strong> en el panel admin.</p>
				`),
			};
	}
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function layout(body: string): string {
	return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:system-ui,sans-serif;color:#111827;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
    <div style="background:#111827;padding:20px 24px;">
      <span style="color:#fff;font-weight:700;font-size:16px;">JABB — Panel Admin</span>
    </div>
    <div style="padding:24px;">
      ${body}
    </div>
    <div style="padding:16px 24px;background:#f3f4f6;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#6b7280;">
        Mensaje automático del sistema. No respondas a este email.
      </p>
    </div>
  </div>
</body>
</html>`;
}
