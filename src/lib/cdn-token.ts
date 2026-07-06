import { SignJWT, decodeJwt } from 'jose';
import { JWT_SECRET } from '$env/static/private';

const CDN_TOKEN_TTL = '1h';
// Renueva el token si le quedan menos de este margen antes de expirar.
// Sprint 8: llamar refreshCdnTokenIfNeeded() en el layout guard de (app).
const REFRESH_MARGIN_SECONDS = 15 * 60;

function getSecret() {
	return new TextEncoder().encode(JWT_SECRET);
}

/**
 * Emite un JWT HS256 para el Worker CDN al momento del login.
 *
 * LIMITACIÓN CONOCIDA (Sprint 8):
 * - El token incluye los project_ids del usuario en el instante del login.
 *   Si se añade al usuario a un proyecto nuevo durante la sesión, el token no
 *   lo refleja hasta que vuelva a hacer login.
 * - El token expira en 1 hora y no se renueva automáticamente. Usar
 *   refreshCdnTokenIfNeeded() en el layout guard para renovarlo antes de que
 *   expire (Sprint 8).
 */
export async function signCdnToken(userId: string, projectIds: string[]): Promise<string> {
	return new SignJWT({ projects: projectIds })
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(userId)
		.setIssuedAt()
		.setExpirationTime(CDN_TOKEN_TTL)
		.sign(getSecret());
}

/**
 * Renueva el cdn_token si está próximo a expirar.
 * Devuelve el nuevo token, o null si el actual todavía es válido.
 *
 * Sprint 8: integrar en (app)/+layout.server.ts.
 */
export async function refreshCdnTokenIfNeeded(
	currentToken: string | undefined,
	userId: string,
	projectIds: string[]
): Promise<string | null> {
	if (!currentToken) return signCdnToken(userId, projectIds);

	try {
		const claims = decodeJwt(currentToken);
		const exp = claims.exp ?? 0;
		const secondsLeft = exp - Math.floor(Date.now() / 1000);
		if (secondsLeft > REFRESH_MARGIN_SECONDS) return null; // aún válido
	} catch {
		// Token malformado → emitir uno nuevo
	}

	return signCdnToken(userId, projectIds);
}
