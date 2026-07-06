import { fail, redirect } from '@sveltejs/kit';
import { signCdnToken } from '$lib/cdn-token';
import { checkRateLimit, recordAttempt, purgeOldAttempts } from '$lib/rate-limit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const { session } = await locals.safeGetSession();
	if (session) redirect(302, '/dashboard');
	return {};
};

export const actions: Actions = {
	default: async ({ request, locals, cookies, getClientAddress }) => {
		const ip = getClientAddress();

		const { allowed, remaining } = await checkRateLimit(ip);
		if (!allowed) {
			return fail(429, {
				error: `Demasiados intentos fallidos. Espera ${15} minutos antes de volver a intentarlo.`
			});
		}

		const data = await request.formData();
		const email = String(data.get('email') ?? '');
		const password = String(data.get('password') ?? '');

		if (!email || !password) {
			return fail(400, { error: 'Email y contraseña son requeridos.' });
		}

		const { data: authData, error } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error || !authData.user) {
			await recordAttempt(ip, false);
			// Mostramos los intentos restantes solo si quedan pocos, para no dar información innecesaria.
			const hint = remaining <= 3 ? ` (${remaining} intentos restantes)` : '';
			return fail(401, { error: `Credenciales inválidas.${hint}` });
		}

		await Promise.all([recordAttempt(ip, true), purgeOldAttempts(ip)]);

		const { data: memberships } = await locals.supabase
			.from('project_members')
			.select('project_id')
			.eq('user_id', authData.user.id);

		const projectIds = (memberships ?? []).map((m) => m.project_id);
		const cdnToken = await signCdnToken(authData.user.id, projectIds);

		cookies.set('cdn_token', cdnToken, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: import.meta.env.PROD,
			maxAge: 60 * 60
		});

		redirect(302, '/dashboard');
	}
};
