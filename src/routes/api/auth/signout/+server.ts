import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	await locals.supabase.auth.signOut();
	cookies.delete('cdn_token', { path: '/' });
	redirect(302, '/login');
};
