import { error } from '@sveltejs/kit';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Carga el proyecto o lanza 404 si no existe. `columns` sigue la sintaxis de select() de Supabase. */
export async function requireProject<Cols extends string>(
	supabase:  SupabaseClient,
	projectId: string,
	columns:   Cols,
	message   = 'Proyecto no encontrado.',
) {
	const { data: project } = await supabase
		.from('projects')
		.select(columns)
		.eq('id', projectId)
		.single();

	if (!project) error(404, message);

	return project;
}
