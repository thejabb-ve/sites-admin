import { describe, it, expect } from 'bun:test';
import { SignJWT, decodeJwt } from 'jose';
import { signCdnToken, refreshCdnTokenIfNeeded } from './cdn-token';

// JWT_SECRET viene mockeado globalmente en test-setup.ts como 'test-jwt-secret'.

function makeTokenWithSecondsLeft(secondsLeft: number, subject = 'user-x'): Promise<string> {
	const secret = new TextEncoder().encode('any-secret-works-decodeJwt-no-verifica');
	const nowSeconds = Math.floor(Date.now() / 1000);
	return new SignJWT({ projects: ['p1'] })
		.setProtectedHeader({ alg: 'HS256' })
		.setSubject(subject)
		.setIssuedAt()
		.setExpirationTime(nowSeconds + secondsLeft)
		.sign(secret);
}

describe('signCdnToken', () => {
	it('genera un JWT con formato de 3 partes separadas por punto', async () => {
		const token = await signCdnToken('user-1', ['proj-1']);
		expect(token.split('.').length).toBe(3);
	});

	it('incluye el userId como subject', async () => {
		const token = await signCdnToken('user-1', ['proj-1', 'proj-2']);
		const claims = decodeJwt(token);
		expect(claims.sub).toBe('user-1');
	});

	it('incluye los project_ids en el claim projects', async () => {
		const token = await signCdnToken('user-1', ['proj-1', 'proj-2']);
		const claims = decodeJwt(token);
		expect(claims.projects).toEqual(['proj-1', 'proj-2']);
	});

	it('expira aproximadamente 1 hora después de emitirse', async () => {
		const before = Math.floor(Date.now() / 1000);
		const token = await signCdnToken('user-1', []);
		const claims = decodeJwt(token);
		const exp = claims.exp ?? 0;
		const iat = claims.iat ?? 0;
		expect(exp - iat).toBe(3600);
		expect(exp).toBeGreaterThanOrEqual(before + 3600 - 2);
		expect(exp).toBeLessThanOrEqual(before + 3600 + 5);
	});

	it('acepta un array vacío de project_ids', async () => {
		const token = await signCdnToken('user-1', []);
		const claims = decodeJwt(token);
		expect(claims.projects).toEqual([]);
	});

	it('acepta un userId vacío sin lanzar', async () => {
		const token = await signCdnToken('', ['proj-1']);
		const claims = decodeJwt(token);
		expect(claims.sub).toBe('');
	});
});

describe('refreshCdnTokenIfNeeded', () => {
	it('emite un token nuevo cuando no hay currentToken', async () => {
		const result = await refreshCdnTokenIfNeeded(undefined, 'user-1', ['proj-1']);
		expect(result).not.toBeNull();
		const claims = decodeJwt(result as string);
		expect(claims.sub).toBe('user-1');
	});

	it('devuelve null si el token actual tiene más margen que REFRESH_MARGIN_SECONDS (15 min)', async () => {
		const token = await makeTokenWithSecondsLeft(15 * 60 + 60); // 16 min restantes
		const result = await refreshCdnTokenIfNeeded(token, 'user-1', ['proj-1']);
		expect(result).toBeNull();
	});

	it('renueva cuando quedan exactamente 900s (límite inclusive del margen)', async () => {
		const token = await makeTokenWithSecondsLeft(15 * 60); // exactamente 900s
		const result = await refreshCdnTokenIfNeeded(token, 'user-1', ['proj-1']);
		// secondsLeft > REFRESH_MARGIN_SECONDS es false cuando son iguales → debe renovar
		expect(result).not.toBeNull();
	});

	it('renueva cuando queda menos margen que REFRESH_MARGIN_SECONDS', async () => {
		const token = await makeTokenWithSecondsLeft(60); // 1 min restante
		const result = await refreshCdnTokenIfNeeded(token, 'user-1', ['proj-1']);
		expect(result).not.toBeNull();
		const claims = decodeJwt(result as string);
		expect(claims.sub).toBe('user-1');
	});

	it('renueva cuando el token ya está expirado', async () => {
		const token = await makeTokenWithSecondsLeft(-60); // expiró hace 1 min
		const result = await refreshCdnTokenIfNeeded(token, 'user-1', ['proj-1']);
		expect(result).not.toBeNull();
	});

	it('renueva cuando el token está malformado (no es un JWT válido)', async () => {
		const result = await refreshCdnTokenIfNeeded('esto-no-es-un-jwt', 'user-1', ['proj-1']);
		expect(result).not.toBeNull();
		const claims = decodeJwt(result as string);
		expect(claims.sub).toBe('user-1');
	});

	it('renueva cuando el token es una cadena vacía', async () => {
		const result = await refreshCdnTokenIfNeeded('', 'user-1', ['proj-1']);
		expect(result).not.toBeNull();
	});

	it('el token renovado refleja los project_ids actuales pasados, no los del token viejo', async () => {
		const oldToken = await makeTokenWithSecondsLeft(-60);
		const result = await refreshCdnTokenIfNeeded(oldToken, 'user-1', ['proj-nuevo']);
		const claims = decodeJwt(result as string);
		expect(claims.projects).toEqual(['proj-nuevo']);
	});
});
