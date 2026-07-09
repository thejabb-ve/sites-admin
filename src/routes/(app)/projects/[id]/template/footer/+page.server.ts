import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { ADMIN_BLOCK_REGISTRY } from '$lib/blocks/adminRegistry';

export const load: PageServerLoad = async ({ locals, params }) => {
  const { data: project } = await locals.supabase
    .from('projects')
    .select('id, name, footer_props')
    .eq('id', params.id)
    .single();

  if (!project) error(404, 'Proyecto no encontrado.');

  return { project };
};

export const actions: Actions = {
  save: async ({ locals, params, request }) => {
    const form     = await request.formData();
    const propsRaw = String(form.get('props') ?? '').trim();

    let parsed: unknown;
    try { parsed = JSON.parse(propsRaw); } catch {
      return fail(400, { error: 'JSON inválido.' });
    }

    const entry = ADMIN_BLOCK_REGISTRY['footer'];
    if (!entry) return fail(500, { error: 'Configuración de footer no encontrada.' });

    const result = entry.schema.safeParse(parsed);
    if (!result.success) {
      const msgs = result.error.issues.map(i => i.message).join(', ');
      return fail(400, { error: `Props inválidas: ${msgs}` });
    }

    const { error: dbError } = await locals.supabase
      .from('projects')
      .update({ footer_props: result.data as never })
      .eq('id', params.id);

    if (dbError) return fail(500, { error: 'Error al guardar el pie de página.' });

    return { success: true };
  },
};
