import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// RLS filtra automáticamente: solo devuelve proyectos donde el usuario es miembro
	const { data: projects, error } = await locals.supabase
		.from('projects')
		.select('id, name, created_at')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Error cargando proyectos:', error.message);
		return { projects: [] };
	}

	return { projects: projects ?? [] };
};
