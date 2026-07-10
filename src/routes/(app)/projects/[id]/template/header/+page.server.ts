import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { ADMIN_BLOCK_REGISTRY } from '$lib/blocks/adminRegistry';
import { logAudit } from '$lib/audit';

export const load: PageServerLoad = async ({ locals, params }) => {
  const { data: project } = await locals.supabase
    .from('projects')
    .select('id, name, header_props')
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

    const entry = ADMIN_BLOCK_REGISTRY['header'];
    if (!entry) return fail(500, { error: 'Configuración de header no encontrada.' });

    const result = entry.schema.safeParse(parsed);
    if (!result.success) {
      const msgs = result.error.issues.map(i => i.message).join(', ');
      return fail(400, { error: `Props inválidas: ${msgs}` });
    }

    const { error: dbError } = await locals.supabase
      .from('projects')
      .update({ header_props: result.data as never })
      .eq('id', params.id);

    if (dbError) return fail(500, { error: 'Error al guardar el encabezado.' });

    const { user } = await locals.safeGetSession();
    await logAudit({
      supabase: locals.supabase,
      projectId: params.id,
      userId: user?.id ?? null,
      actor: user?.email ?? 'desconocido',
      action: 'update',
      resourceType: 'template',
      resourceName: 'Encabezado',
      changed: ['header_props'],
    });

    return { success: true };
  },
};
