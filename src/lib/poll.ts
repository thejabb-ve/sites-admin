export interface PollHandle {
	stop: () => void;
}

/**
 * Repite `fn` cada `intervalMs` hasta que devuelva `true` (terminado) o se llame a `stop()`.
 * `fn` debe manejar sus propios errores y decidir si eso implica parar (devolver `true`) o
 * reintentar (devolver `false`) — el helper no asume nada sobre qué es un error fatal.
 */
export function pollUntil(opts: {
	fn: () => Promise<boolean>;
	intervalMs: number;
	/** Tope de intentos para evitar polling indefinido si `fn` nunca devuelve `true`. */
	maxTries?: number;
}): PollHandle {
	let tries   = 0;
	let stopped = false;
	let timer: ReturnType<typeof setTimeout> | null = null;

	function stop() {
		stopped = true;
		if (timer !== null) { clearTimeout(timer); timer = null; }
	}

	async function tick() {
		if (stopped) return;
		tries++;
		const done = await opts.fn();
		if (stopped || done) return;
		if (opts.maxTries !== undefined && tries >= opts.maxTries) return;
		timer = setTimeout(tick, opts.intervalMs);
	}

	timer = setTimeout(tick, opts.intervalMs);
	return { stop };
}
