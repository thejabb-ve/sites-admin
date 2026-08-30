import { describe, it, expect } from 'bun:test';
import { LEGAL_PAGES, type LegalInfo } from './legalTemplates';

const baseInfo: LegalInfo = {
	company: 'Mi Empresa C.A.',
	address: 'Av. Principal, Caracas',
	email:   'contacto@miempresa.com',
	web:     'https://miempresa.com',
	tax_id:  'J-12345678-9',
	motive:  'Venta de productos',
};

function getPage(slug: string) {
	const page = LEGAL_PAGES.find((p) => p.slug === slug);
	if (!page) throw new Error(`No existe la página legal ${slug}`);
	return page;
}

describe('LEGAL_PAGES — metadatos', () => {
	it('expone las 3 páginas legales esperadas', () => {
		expect(LEGAL_PAGES.length).toBe(3);
		expect(LEGAL_PAGES.map((p) => p.slug)).toEqual([
			'aviso-legal',
			'politica-de-privacidad',
			'politica-de-cookies',
		]);
	});

	it('cada página tiene full_path que empieza con /', () => {
		for (const page of LEGAL_PAGES) {
			expect(page.full_path.startsWith('/')).toBe(true);
		}
	});

	it('cada página tiene un title no vacío', () => {
		for (const page of LEGAL_PAGES) {
			expect(page.title.length).toBeGreaterThan(0);
		}
	});
});

describe('content() — interpolación de placeholders', () => {
	it('sustituye {{company}} en todas las apariciones (aviso-legal)', () => {
		const html = getPage('aviso-legal').content(baseInfo);
		expect(html.includes('{{company}}')).toBe(false);
		expect(html).toContain('Mi Empresa C.A.');
	});

	it('sustituye todos los placeholders conocidos en politica-de-privacidad', () => {
		const html = getPage('politica-de-privacidad').content(baseInfo);
		for (const key of ['company', 'address', 'email', 'web', 'tax_id', 'motive'] as const) {
			expect(html.includes(`{{${key}}}`)).toBe(false);
		}
	});

	it('sustituye placeholders en politica-de-cookies (solo company y web aparecen en esa plantilla)', () => {
		const html = getPage('politica-de-cookies').content(baseInfo);
		expect(html.includes('{{company}}')).toBe(false);
		expect(html.includes('{{web}}')).toBe(false);
		expect(html).toContain('Mi Empresa C.A.');
	});

	it('no dejan placeholders residuales de ningún tipo tras el fill', () => {
		for (const page of LEGAL_PAGES) {
			const html = page.content(baseInfo);
			expect(html).not.toMatch(/\{\{\w+\}\}/);
		}
	});

	it('reemplaza múltiples apariciones repetidas del mismo campo ({{company}} aparece muchas veces)', () => {
		const html = getPage('aviso-legal').content(baseInfo);
		const occurrences = html.split('Mi Empresa C.A.').length - 1;
		expect(occurrences).toBeGreaterThan(5);
	});

	it('maneja valores vacíos sin lanzar y deja el hueco vacío', () => {
		const emptyInfo: LegalInfo = { company: '', address: '', email: '', web: '', tax_id: '', motive: '' };
		expect(() => getPage('aviso-legal').content(emptyInfo)).not.toThrow();
		const html = getPage('aviso-legal').content(emptyInfo);
		expect(html).not.toMatch(/\{\{\w+\}\}/);
	});

	it('maneja valores muy largos sin truncar', () => {
		const longCompany = 'A'.repeat(5000);
		const info: LegalInfo = { ...baseInfo, company: longCompany };
		const html = getPage('aviso-legal').content(info);
		expect(html).toContain(longCompany);
	});
});

describe('content() — SEGURIDAD: escape de HTML/XSS en datos de usuario', () => {
	// legalTemplates.fill() usa String.prototype.replace sin ningún escape de HTML.
	// Estos campos (company, address, email, web, tax_id, motive) vienen de datos
	// editables por el usuario en el panel admin (brand manual / project settings).
	// Si el HTML resultante se renderiza sin sanitizar (p.ej. vía marked sobre este
	// markdown, que por defecto no sanitiza HTML embebido), esto es una vía de
	// inyección de HTML/XSS almacenado.

	it('NO escapa "<script>" en company — HALLAZGO DE SEGURIDAD si este test falla', () => {
		const malicious: LegalInfo = { ...baseInfo, company: '<script>alert(1)</script>' };
		const html = getPage('aviso-legal').content(malicious);

		// Comportamiento esperado y seguro: el tag debería venir escapado como entidad HTML.
		expect(html).not.toContain('<script>alert(1)</script>');
	});

	it('NO escapa comillas/atributos inyectables en address — HALLAZGO DE SEGURIDAD si este test falla', () => {
		const malicious: LegalInfo = {
			...baseInfo,
			address: '"><img src=x onerror=alert(1)>',
		};
		const html = getPage('politica-de-privacidad').content(malicious);

		expect(html).not.toContain('<img src=x onerror=alert(1)>');
	});

	it('NO escapa "&" en motive (podría romper entidades HTML) — HALLAZGO DE SEGURIDAD si este test falla', () => {
		const malicious: LegalInfo = { ...baseInfo, motive: 'Venta & <b>marketing</b>' };
		const html = getPage('aviso-legal').content(malicious);

		expect(html).not.toContain('<b>marketing</b>');
	});

	it('NO escapa payload XSS en email/tax_id (política-de-privacidad usa ambos placeholders) — HALLAZGO DE SEGURIDAD si este test falla', () => {
		const malicious: LegalInfo = {
			...baseInfo,
			email:  '<script>alert(2)</script>',
			tax_id: '<svg onload=alert(4)>',
		};
		const html = getPage('politica-de-privacidad').content(malicious);

		expect(html).not.toContain('<script>alert(2)</script>');
		expect(html).not.toContain('<svg onload=alert(4)>');
	});
});

describe('content() — SEGURIDAD: inyección de sintaxis Markdown en datos de usuario', () => {
	// company se interpola dentro de `[{{company}}]({{web}})` (aviso-legal, sección 1.4.1).
	// Un valor que contenga metacaracteres Markdown sin escapar podría romper esa sintaxis
	// de link y construir uno nuevo con un esquema de URL arbitrario (ej. javascript:).

	it('escapa metacaracteres Markdown en company: no se forma un link nuevo con esquema arbitrario', () => {
		const malicious: LegalInfo = { ...baseInfo, company: 'x](javascript:alert(1))(' };
		const html = getPage('aviso-legal').content(malicious);

		expect(html).not.toContain('x](javascript:alert(1))(');
		// Los metacaracteres deben venir escapados con backslash, preservados como texto literal.
		expect(html).toContain('x\\]\\(javascript:alert\\(1\\)\\)\\(');
	});

	it('escapa metacaracteres Markdown en motive/address sin romper la plantilla', () => {
		const malicious: LegalInfo = {
			...baseInfo,
			motive:  '# Fake Heading\n[click](javascript:alert(1))',
			address: '*bold injection* `code`',
		};
		expect(() => getPage('aviso-legal').content(malicious)).not.toThrow();
		const html = getPage('aviso-legal').content(malicious);
		expect(html).not.toContain('[click](javascript:alert(1))');
	});
});
