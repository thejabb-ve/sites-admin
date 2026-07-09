import { error, fail } from '@sveltejs/kit';
import { z } from 'zod/v4';
import type { PageServerLoad, Actions } from './$types';

// ─── Tipos locales ────────────────────────────────────────────────────────────

export interface FontSpec {
	family:  string;
	weights: number[];
	source:  'google' | 'system' | 'custom';
	urls?:   { weight: number; style?: string; url: string }[];
}

export interface BrandDraft {
	colors:      Record<string, string>;
	colors_dark: Record<string, string>;
	typography: {
		display:     FontSpec;
		body:        FontSpec;
		mono?:       FontSpec;
		size_base?:  string;
		line_height?: string;
		tracking?:   string;
	};
	radii:     Record<string, string>;
	shadows:   Record<string, string>;
	spacing:   { scale?: number };
	layout:    { max_width_content?: string; max_width_prose?: string };
	legal_info: { address?: string; legalLinks?: { label: string; href: string }[] };
	custom_css: string | null;
}

// ─── Schemas de validación ────────────────────────────────────────────────────

const oklchSchema   = z.string().regex(/^oklch\(.+\)$/, 'Debe ser formato oklch(...)');
const colorsSchema  = z.record(z.string(), oklchSchema);

const fontSpecSchema = z.object({
	family:  z.string().min(1),
	weights: z.array(z.number().int().min(100).max(900)).min(1),
	source:  z.enum(['google', 'system', 'custom']),
	urls:    z.array(z.object({
		weight: z.number(),
		style:  z.string().optional(),
		url:    z.string(),
	})).optional(),
});

const typographySchema = z.object({
	display:     fontSpecSchema,
	body:        fontSpecSchema,
	mono:        fontSpecSchema.optional(),
	size_base:   z.string().optional(),
	line_height: z.string().optional(),
	tracking:    z.string().optional(),
});

const draftSchema = z.object({
	colors:      colorsSchema,
	colors_dark: z.record(z.string(), z.string()),
	typography:  typographySchema,
	radii:       z.record(z.string(), z.string()),
	shadows:     z.record(z.string(), z.string()),
	spacing:     z.object({ scale: z.number().positive().optional() }),
	layout:      z.object({
		max_width_content: z.string().optional(),
		max_width_prose:   z.string().optional(),
	}),
	legal_info:  z.object({
		address:    z.string().optional(),
		legalLinks: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
	}),
	custom_css:  z.string().nullable(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mergeDeep(
	base: Record<string, unknown>,
	over: Record<string, unknown>,
): Record<string, unknown> {
	const result = { ...base };
	for (const [k, v] of Object.entries(over)) {
		if (v !== null && typeof v === 'object' && !Array.isArray(v) &&
				typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k])) {
			result[k] = mergeDeep(
				base[k] as Record<string, unknown>,
				v as Record<string, unknown>,
			);
		} else if (v !== undefined) {
			result[k] = v;
		}
	}
	return result;
}

function asRecord(v: unknown): Record<string, unknown> {
	return (v && typeof v === 'object' && !Array.isArray(v))
		? v as Record<string, unknown>
		: {};
}

// ─── Load ─────────────────────────────────────────────────────────────────────

export const load: PageServerLoad = async ({ locals, params }) => {
	const { data: project } = await locals.supabase
		.from('projects')
		.select('id, name, canonical_domain')
		.eq('id', params.id)
		.single();

	if (!project) error(404, 'Proyecto no encontrado.');

	const [{ data: manual }, { data: domains }] = await Promise.all([
		locals.supabase
			.from('brand_manuals')
			.select('*')
			.eq('project_id', params.id)
			.single(),
		locals.supabase
			.from('domains')
			.select('domain, is_active')
			.eq('project_id', params.id)
			.order('is_active', { ascending: false })
			.order('domain'),
	]);

	// URL del preview: dominio activo o canonical_domain
	const activeDomain = (domains ?? []).find(d => d.is_active)?.domain
		?? (domains ?? [])[0]?.domain
		?? null;
	const previewUrl = activeDomain
		? `https://${activeDomain}`
		: (project.canonical_domain ?? null);

	// Estado efectivo: campos publicados + draft_overrides encima (si existen)
	let effectiveState: BrandDraft | null = null;
	if (manual) {
		const base: Record<string, unknown> = {
			colors:      asRecord(manual.colors),
			colors_dark: asRecord(manual.colors_dark),
			typography:  asRecord(manual.typography),
			radii:       asRecord(manual.radii),
			shadows:     asRecord(manual.shadows),
			spacing:     asRecord(manual.spacing),
			layout:      asRecord(manual.layout),
			legal_info:  asRecord(manual.legal_info),
			custom_css:  manual.custom_css ?? null,
		};
		const overrides = manual.draft_overrides ? asRecord(manual.draft_overrides) : {};
		effectiveState = mergeDeep(base, overrides) as unknown as BrandDraft;
	}

	return {
		project,
		manual,
		effectiveState,
		previewUrl,
	};
};

// ─── Actions ──────────────────────────────────────────────────────────────────

export const actions: Actions = {
	saveDraft: async ({ locals, params, request }) => {
		const form = await request.formData();
		const raw  = String(form.get('draft') ?? '');

		let parsed: unknown;
		try { parsed = JSON.parse(raw); } catch {
			return fail(400, { error: 'JSON inválido.' });
		}

		const result = draftSchema.safeParse(parsed);
		if (!result.success) {
			const msgs = result.error.issues.map(i => i.message).join(', ');
			return fail(400, { error: `Datos inválidos: ${msgs}` });
		}

		const { error: dbError } = await locals.supabase
			.from('brand_manuals')
			.upsert(
				{ project_id: params.id, draft_overrides: result.data as never },
				{ onConflict: 'project_id' },
			);

		if (dbError) return fail(500, { error: 'Error al guardar borrador.' });

		return { success: 'draft' as const };
	},

	publish: async ({ locals, params, request }) => {
		const form    = await request.formData();
		const raw     = String(form.get('manual') ?? '');
		const version = parseInt(String(form.get('version') ?? '0'), 10);

		let parsed: unknown;
		try { parsed = JSON.parse(raw); } catch {
			return fail(400, { error: 'JSON inválido.' });
		}

		const result = draftSchema.safeParse(parsed);
		if (!result.success) {
			const msgs = result.error.issues.map(i => i.message).join(', ');
			return fail(400, { error: `Datos inválidos: ${msgs}` });
		}

		const d = result.data;
		const { error: dbError } = await locals.supabase
			.from('brand_manuals')
			.upsert(
				{
					project_id:  params.id,
					colors:      d.colors as never,
					colors_dark: d.colors_dark as never,
					typography:  d.typography as never,
					radii:       d.radii as never,
					shadows:     d.shadows as never,
					spacing:     d.spacing as never,
					layout:      d.layout as never,
					legal_info:  d.legal_info as never,
					custom_css:  d.custom_css,
					draft_overrides: null,
					version: (version || 0) + 1,
				},
				{ onConflict: 'project_id' },
			);

		if (dbError) return fail(500, { error: 'Error al publicar.' });

		return { success: 'published' as const };
	},
};
