import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { isValidGa4Id, isValidRobots } from '$lib/metadata';

export const load: PageServerLoad = async ({ locals, params }) => {
	const { data: project } = await locals.supabase
		.from('projects')
		.select('id, name, ga4_id, site_name, title_separator, default_robots, canonical_domain, twitter_handle')
		.eq('id', params.id)
		.single();

	if (!project) error(404, 'Proyecto no encontrado.');

	return { project };
};

export const actions: Actions = {
	saveGa4: async ({ locals, params, request }) => {
		const form  = await request.formData();
		const ga4Id = String(form.get('ga4_id') ?? '').trim() || null;

		if (ga4Id !== null && !isValidGa4Id(ga4Id)) {
			return fail(400, { field: 'ga4', error: 'El formato del ID de Google Analytics debe ser G-XXXXXXXXXX.' });
		}

		const { error: dbError } = await locals.supabase
			.from('projects')
			.update({ ga4_id: ga4Id })
			.eq('id', params.id);

		if (dbError) return fail(500, { field: 'ga4', error: 'Error al guardar.' });

		return { success: 'ga4' };
	},

	saveSiteConfig: async ({ locals, params, request }) => {
		const form            = await request.formData();
		const siteName        = String(form.get('site_name')        ?? '').trim() || null;
		const titleSeparator  = String(form.get('title_separator')  ?? '')         || ' | ';
		const defaultRobots   = String(form.get('default_robots')   ?? '').trim();
		const canonicalDomain = String(form.get('canonical_domain') ?? '').trim() || null;
		const twitterHandle   = String(form.get('twitter_handle')   ?? '').trim() || null;

		if (!isValidRobots(defaultRobots)) {
			return fail(400, { field: 'site', error: 'Valor de robots inválido.' });
		}

		if (canonicalDomain !== null) {
			try { new URL(canonicalDomain); } catch {
				return fail(400, { field: 'site', error: 'El dominio canónico debe ser una URL válida (ej. https://tudominio.com).' });
			}
		}

		const { error: dbError } = await locals.supabase
			.from('projects')
			.update({ site_name: siteName, title_separator: titleSeparator, default_robots: defaultRobots, canonical_domain: canonicalDomain, twitter_handle: twitterHandle })
			.eq('id', params.id);

		if (dbError) return fail(500, { field: 'site', error: 'Error al guardar.' });

		return { success: 'site' };
	},
};
