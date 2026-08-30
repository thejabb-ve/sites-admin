import { describe, it, expect } from 'bun:test';
import { VALID_ROBOTS, isValidRobots, isValidSlug, isValidGa4Id, isValidFullPath, slugify } from './metadata';

describe('isValidRobots', () => {
	it('acepta todos los valores de VALID_ROBOTS', () => {
		for (const v of VALID_ROBOTS) {
			expect(isValidRobots(v)).toBe(true);
		}
	});

	it('rechaza un valor no listado', () => {
		expect(isValidRobots('noindex')).toBe(false);
	});

	it('rechaza cadena vacía', () => {
		expect(isValidRobots('')).toBe(false);
	});

	it('es sensible a mayúsculas/minúsculas', () => {
		expect(isValidRobots('Index, Follow')).toBe(false);
	});

	it('rechaza con espacios extra', () => {
		expect(isValidRobots('index,  follow')).toBe(false);
		expect(isValidRobots(' index, follow')).toBe(false);
	});
});

describe('isValidSlug', () => {
	it('acepta minúsculas, números y guiones', () => {
		expect(isValidSlug('mi-slug-123')).toBe(true);
	});

	it('acepta un solo carácter', () => {
		expect(isValidSlug('a')).toBe(true);
	});

	it('rechaza cadena vacía', () => {
		expect(isValidSlug('')).toBe(false);
	});

	it('rechaza mayúsculas', () => {
		expect(isValidSlug('Mi-Slug')).toBe(false);
	});

	it('rechaza espacios', () => {
		expect(isValidSlug('mi slug')).toBe(false);
	});

	it('rechaza guion bajo y otros símbolos', () => {
		expect(isValidSlug('mi_slug')).toBe(false);
		expect(isValidSlug('mi/slug')).toBe(false);
		expect(isValidSlug('mi.slug')).toBe(false);
	});

	it('rechaza caracteres acentuados/unicode', () => {
		expect(isValidSlug('canción')).toBe(false);
	});
});

describe('isValidGa4Id', () => {
	it('acepta el formato G- seguido de alfanuméricos en mayúscula', () => {
		expect(isValidGa4Id('G-ABC1234XYZ')).toBe(true);
	});

	it('rechaza sin el prefijo G-', () => {
		expect(isValidGa4Id('ABC1234XYZ')).toBe(false);
	});

	it('rechaza minúsculas', () => {
		expect(isValidGa4Id('G-abc1234')).toBe(false);
	});

	it('rechaza cadena vacía', () => {
		expect(isValidGa4Id('')).toBe(false);
	});

	it('rechaza solo el prefijo sin id', () => {
		// El regex /^G-[A-Z0-9]+$/ requiere al menos un carácter tras G-
		expect(isValidGa4Id('G-')).toBe(false);
	});

	it('rechaza guiones extra dentro del id', () => {
		expect(isValidGa4Id('G-ABC-123')).toBe(false);
	});
});

describe('isValidFullPath', () => {
	it('acepta una ruta simple de un segmento', () => {
		expect(isValidFullPath('/inicio')).toBe(true);
	});

	it('acepta una ruta con múltiples segmentos', () => {
		expect(isValidFullPath('/modelo/es/comite')).toBe(true);
	});

	it('rechaza rutas sin slash inicial', () => {
		expect(isValidFullPath('inicio')).toBe(false);
	});

	it('rechaza rutas con doble slash', () => {
		expect(isValidFullPath('/modelo//es')).toBe(false);
	});

	it('rechaza rutas con slash final', () => {
		expect(isValidFullPath('/modelo/')).toBe(false);
	});

	it('rechaza raíz sola "/"', () => {
		expect(isValidFullPath('/')).toBe(false);
	});

	it('rechaza rutas con ".."', () => {
		expect(isValidFullPath('/modelo/../es')).toBe(false);
	});

	it('rechaza rutas con espacios', () => {
		expect(isValidFullPath('/mi ruta')).toBe(false);
	});

	it('rechaza rutas con mayúsculas', () => {
		expect(isValidFullPath('/Modelo/ES')).toBe(false);
	});

	it('rechaza cadena vacía', () => {
		expect(isValidFullPath('')).toBe(false);
	});
});

describe('slugify', () => {
	it('convierte a minúsculas', () => {
		expect(slugify('HOLA MUNDO')).toBe('hola-mundo');
	});

	it('reemplaza espacios por guiones', () => {
		expect(slugify('hola mundo feliz')).toBe('hola-mundo-feliz');
	});

	it('elimina acentos', () => {
		expect(slugify('Canción Épica')).toBe('cancion-epica');
	});

	it('elimina la eñe correctamente (normaliza a n, no ideal pero es el comportamiento actual)', () => {
		// NFD descompone ñ en n + combining tilde, que luego se elimina junto a otros diacríticos
		expect(slugify('Año Nuevo')).toBe('ano-nuevo');
	});

	it('colapsa símbolos consecutivos en un solo guion', () => {
		expect(slugify('hola!!!  ¿qué tal?')).toBe('hola-que-tal');
	});

	it('elimina guiones al inicio y al final', () => {
		expect(slugify('--hola mundo--')).toBe('hola-mundo');
	});

	it('devuelve cadena vacía para input vacío', () => {
		expect(slugify('')).toBe('');
	});

	it('devuelve cadena vacía si el input es solo símbolos', () => {
		expect(slugify('!!!???')).toBe('');
	});

	it('conserva números', () => {
		expect(slugify('Comité 2026')).toBe('comite-2026');
	});

	it('maneja cadenas muy largas sin lanzar', () => {
		const long = 'palabra '.repeat(500);
		expect(() => slugify(long)).not.toThrow();
		expect(slugify(long).startsWith('palabra-palabra-palabra')).toBe(true);
	});
});
