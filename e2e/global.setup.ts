import { test as setup } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Credenciales de los dos usuarios de prueba — se leen desde el entorno
export const USER_A = {
	email: process.env.TEST_USER_A_EMAIL ?? 'user_a@test.local',
	password: process.env.TEST_USER_A_PASSWORD ?? 'test-password-a'
};
export const USER_B = {
	email: process.env.TEST_USER_B_EMAIL ?? 'user_b@test.local',
	password: process.env.TEST_USER_B_PASSWORD ?? 'test-password-b'
};

setup('crear usuarios y proyectos de prueba', async () => {
	if (!SERVICE_ROLE_KEY) {
		console.warn('SUPABASE_SERVICE_ROLE_KEY no configurada — se asume que los usuarios ya existen.');
		return;
	}

	const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
		auth: { autoRefreshToken: false, persistSession: false }
	});

	// Crear usuarios (ignora error si ya existen)
	const [{ data: ua }, { data: ub }] = await Promise.all([
		admin.auth.admin.createUser({
			email: USER_A.email,
			password: USER_A.password,
			email_confirm: true
		}),
		admin.auth.admin.createUser({
			email: USER_B.email,
			password: USER_B.password,
			email_confirm: true
		})
	]);

	// Crear proyectos de prueba si los usuarios son nuevos
	if (ua.user && ub.user) {
		const { data: projects } = await admin
			.from('projects')
			.upsert(
				[
					{ name: 'Proyecto A (test)', id: '00000000-0000-0000-0000-000000000001' },
					{ name: 'Proyecto B (test)', id: '00000000-0000-0000-0000-000000000002' }
				],
				{ onConflict: 'id' }
			)
			.select('id');

		if (projects) {
			await admin.from('project_members').upsert(
				[
					{
						project_id: '00000000-0000-0000-0000-000000000001',
						user_id: ua.user.id,
						role: 'owner'
					},
					{
						project_id: '00000000-0000-0000-0000-000000000002',
						user_id: ub.user.id,
						role: 'owner'
					}
				],
				{ onConflict: 'project_id,user_id' }
			);
		}
	}
});
