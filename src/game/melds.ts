import { KIND_COUNT, isHonor } from "./tiles";
import type { Kind } from "./types";

export interface SetPart {
	type: "pung" | "chow";
	kinds: Kind[];
}

export interface Decomposition {
	pair: Kind;
	sets: SetPart[];
}

const ORPHANS: Kind[] = [0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33];

function canStartChow(kind: Kind): boolean {
	return kind < 27 && kind % 9 <= 6;
}

/** Enumerates every way the remaining counts split into exactly `need` sets. */
function searchSets(
	counts: number[],
	need: number,
	acc: SetPart[],
	out: SetPart[][],
): void {
	let i = 0;
	while (i < KIND_COUNT && counts[i] === 0) i++;
	if (i === KIND_COUNT) {
		if (need === 0) out.push([...acc]);
		return;
	}
	if (need === 0) return;

	if (counts[i] >= 3) {
		counts[i] -= 3;
		acc.push({ type: "pung", kinds: [i, i, i] });
		searchSets(counts, need - 1, acc, out);
		acc.pop();
		counts[i] += 3;
	}
	if (canStartChow(i) && counts[i + 1] > 0 && counts[i + 2] > 0) {
		counts[i] -= 1;
		counts[i + 1] -= 1;
		counts[i + 2] -= 1;
		acc.push({ type: "chow", kinds: [i, i + 1, i + 2] });
		searchSets(counts, need - 1, acc, out);
		acc.pop();
		counts[i] += 1;
		counts[i + 1] += 1;
		counts[i + 2] += 1;
	}
}

/**
 * All ways the concealed counts form `need` sets plus one pair.
 * Returns an empty array when the tiles cannot make a complete hand.
 */
export function decompose(counts: number[], need: number): Decomposition[] {
	const results: Decomposition[] = [];
	const work = [...counts];
	for (let pair = 0; pair < KIND_COUNT; pair++) {
		if (work[pair] < 2) continue;
		work[pair] -= 2;
		const out: SetPart[][] = [];
		searchSets(work, need, [], out);
		for (const sets of out) results.push({ pair, sets });
		work[pair] += 2;
	}
	return results;
}

export function isThirteenOrphans(counts: number[]): boolean {
	let pairs = 0;
	for (let k = 0; k < KIND_COUNT; k++) {
		const isOrphan = ORPHANS.includes(k);
		if (!isOrphan && counts[k] > 0) return false;
		if (isOrphan) {
			if (counts[k] === 0) return false;
			if (counts[k] === 2) pairs += 1;
			else if (counts[k] > 2) return false;
		}
	}
	return pairs === 1;
}

/** 1112345678999 + any one tile of the same suit, fully concealed. */
export function isNineGates(counts: number[]): boolean {
	for (let suit = 0; suit < 3; suit++) {
		const base = suit * 9;
		let total = 0;
		for (let k = 0; k < KIND_COUNT; k++) {
			if (k >= base && k < base + 9) total += counts[k];
			else if (counts[k] > 0) total = -100;
		}
		if (total !== 14) continue;
		const pattern = [3, 1, 1, 1, 1, 1, 1, 1, 3];
		let extra = 0;
		let ok = true;
		for (let i = 0; i < 9; i++) {
			const diff = counts[base + i] - pattern[i];
			if (diff < 0) ok = false;
			else extra += diff;
		}
		if (ok && extra === 1) return true;
	}
	return false;
}

const shantenCache = new Map<string, number>();

/**
 * Standard-form shanten: how many tile swaps away from a ready hand.
 * -1 means the hand is already complete, 0 means ready (tenpai).
 */
export function shanten(counts: number[], meldCount: number): number {
	const key = `${meldCount}|${counts.join(",")}`;
	const cached = shantenCache.get(key);
	if (cached !== undefined) return cached;

	let best = 8;
	const work = [...counts];

	const walk = (
		index: number,
		melds: number,
		partials: number,
		hasPair: boolean,
	): void => {
		if (index >= KIND_COUNT) {
			const m = Math.min(melds + meldCount, 4);
			const pairBlock = hasPair ? 1 : 0;
			const p = Math.min(partials, Math.max(0, 5 - m - pairBlock));
			best = Math.min(best, 8 - 2 * m - p - pairBlock);
			return;
		}
		if (work[index] === 0) {
			walk(index + 1, melds, partials, hasPair);
			return;
		}
		if (melds + meldCount < 4) {
			if (work[index] >= 3) {
				work[index] -= 3;
				walk(index, melds + 1, partials, hasPair);
				work[index] += 3;
			}
			if (
				canStartChow(index) &&
				work[index + 1] > 0 &&
				work[index + 2] > 0
			) {
				work[index] -= 1;
				work[index + 1] -= 1;
				work[index + 2] -= 1;
				walk(index, melds + 1, partials, hasPair);
				work[index] += 1;
				work[index + 1] += 1;
				work[index + 2] += 1;
			}
		}
		if (work[index] >= 2) {
			work[index] -= 2;
			if (!hasPair) walk(index, melds, partials, true);
			walk(index, melds, partials + 1, hasPair);
			work[index] += 2;
		}
		if (!isHonor(index) && index % 9 <= 7 && work[index + 1] > 0) {
			work[index] -= 1;
			work[index + 1] -= 1;
			walk(index, melds, partials + 1, hasPair);
			work[index] += 1;
			work[index + 1] += 1;
		}
		if (canStartChow(index) && work[index + 2] > 0) {
			work[index] -= 1;
			work[index + 2] -= 1;
			walk(index, melds, partials + 1, hasPair);
			work[index] += 1;
			work[index + 2] += 1;
		}
		work[index] -= 1;
		walk(index, melds, partials, hasPair);
		work[index] += 1;
	};

	walk(0, 0, 0, false);

	const total = counts.reduce((sum, c) => sum + c, 0);
	if (meldCount === 0 && total === 13) {
		let distinct = 0;
		let pair = 0;
		for (const k of ORPHANS) {
			if (counts[k] > 0) distinct += 1;
			if (counts[k] >= 2) pair = 1;
		}
		best = Math.min(best, 13 - distinct - pair);
	}

	if (shantenCache.size > 40000) shantenCache.clear();
	shantenCache.set(key, best);
	return best;
}

/** True when adding `kind` to these concealed counts completes the hand. */
export function completesHand(
	counts: number[],
	meldCount: number,
	kind: Kind,
): boolean {
	const work = [...counts];
	work[kind] += 1;
	const total = work.reduce((sum, c) => sum + c, 0);
	if (total !== 14 - meldCount * 3) return false;
	if (meldCount === 0 && isThirteenOrphans(work)) return true;
	return decompose(work, 4 - meldCount).length > 0;
}

/** Tile kinds the hand is currently waiting on, ignoring tile availability. */
export function waits(counts: number[], meldCount: number): Kind[] {
	const result: Kind[] = [];
	for (let k = 0; k < KIND_COUNT; k++) {
		if (counts[k] >= 4) continue;
		if (completesHand(counts, meldCount, k)) result.push(k);
	}
	return result;
}

/** The pairs of hand tiles that could form a chow with `kind`. */
export function chowPairs(counts: number[], kind: Kind): [Kind, Kind][] {
	if (isHonor(kind)) return [];
	const rank = kind % 9;
	const options: [Kind, Kind][] = [];
	if (rank >= 2 && counts[kind - 2] > 0 && counts[kind - 1] > 0)
		options.push([kind - 2, kind - 1]);
	if (
		rank >= 1 &&
		rank <= 7 &&
		counts[kind - 1] > 0 &&
		counts[kind + 1] > 0
	)
		options.push([kind - 1, kind + 1]);
	if (rank <= 6 && counts[kind + 1] > 0 && counts[kind + 2] > 0)
		options.push([kind + 1, kind + 2]);
	return options;
}
