import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

// Cliente service_role exclusivo para rate limiting.
// Se crea una vez por instancia serverless; no expone el key al browser.
const db = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
	auth: { persistSession: false, autoRefreshToken: false }
});

const MAX_ATTEMPTS = 10;
const WINDOW_MINUTES = 15;

export async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remaining: number }> {
	const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

	const { count } = await db
		.from('login_attempts')
		.select('*', { count: 'exact', head: true })
		.eq('ip', ip)
		.eq('succeeded', false)
		.gte('attempted_at', since)
		.then((r) => ({ count: r.count ?? 0 }));

	return {
		allowed: count < MAX_ATTEMPTS,
		remaining: Math.max(0, MAX_ATTEMPTS - count)
	};
}

export async function recordAttempt(ip: string, succeeded: boolean): Promise<void> {
	await db.from('login_attempts').insert({ ip, succeeded });
}

/** Limpia intentos con más de 1 hora para no inflar la tabla. */
export async function purgeOldAttempts(ip: string): Promise<void> {
	const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
	await db.from('login_attempts').delete().eq('ip', ip).lt('attempted_at', oneHourAgo);
}
