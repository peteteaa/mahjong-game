/** Small deterministic PRNG so a hand can be replayed from a seed. */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

export function shuffle<T>(items: T[], rng: Rng): T[] {
	const next = [...items];
	for (let i = next.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		[next[i], next[j]] = [next[j], next[i]];
	}
	return next;
}

export function pick<T>(items: T[], rng: Rng): T {
	return items[Math.floor(rng() * items.length)];
}
