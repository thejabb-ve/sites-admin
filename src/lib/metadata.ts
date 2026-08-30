export const VALID_ROBOTS = [
	'index, follow',
	'noindex, follow',
	'noindex, nofollow',
	'index, nofollow',
] as const;

export function isValidRobots(value: string): boolean {
	return (VALID_ROBOTS as readonly string[]).includes(value);
}

export function isValidSlug(value: string): boolean {
	return /^[a-z0-9-]+$/.test(value);
}

export function isValidGa4Id(value: string): boolean {
	return /^G-[A-Z0-9]+$/.test(value);
}

/** Ruta absoluta simple: empieza con `/`, sin espacios ni `..`, solo minúsculas/números/guiones/slashes. */
export function isValidFullPath(value: string): boolean {
	return /^\/[a-z0-9-]+(\/[a-z0-9-]+)*$/.test(value);
}

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}
