import { chowPairs, shanten } from "./melds";
import type { Rng } from "./random";
import {
	KIND_COUNT,
	countKinds,
	isDragon,
	isHonor,
	isTerminalOrHonor,
	isWind,
} from "./tiles";
import { WIND_EAST } from "./tiles";
import type { ClaimOption, Kind, Player, Tile } from "./types";

export interface AiContext {
	player: Player;
	/** Count of every kind the AI can see: its hand, all melds, all discards. */
	visible: number[];
	seatWind: number;
	roundWind: number;
	rng: Rng;
}

function meldUnits(player: Player): number {
	return player.melds.length;
}

/** How many copies of a kind could still be out there, from this AI's view. */
function live(visible: number[], kind: Kind): number {
	return Math.max(0, 4 - visible[kind]);
}

function ukeire(counts: number[], meldCount: number, visible: number[]): number {
	const base = shanten(counts, meldCount);
	let total = 0;
	for (let k = 0; k < KIND_COUNT; k++) {
		const remaining = live(visible, k);
		if (remaining <= 0) continue;
		counts[k] += 1;
		if (shanten(counts, meldCount) < base) total += remaining;
		counts[k] -= 1;
	}
	return total;
}

/**
 * Tiles an opponent is least sorry to lose, used only to break ties:
 * lone honours go first, then terminals, then middle tiles.
 */
function keepValue(
	kind: Kind,
	counts: number[],
	seatWind: number,
	roundWind: number,
): number {
	let value = 0;
	if (counts[kind] >= 2) value += 4;
	if (!isHonor(kind)) {
		value += 2;
		const rank = kind % 9;
		if (rank >= 2 && rank <= 6) value += 1;
		if (rank > 0 && counts[kind - 1] > 0) value += 2;
		if (rank < 8 && counts[kind + 1] > 0) value += 2;
		if (rank > 1 && counts[kind - 2] > 0) value += 1;
		if (rank < 7 && counts[kind + 2] > 0) value += 1;
	} else {
		if (isDragon(kind)) value += 1;
		if (isWind(kind) && kind - WIND_EAST === seatWind) value += 1;
		if (isWind(kind) && kind - WIND_EAST === roundWind) value += 1;
	}
	return value;
}

export function chooseDiscard(ctx: AiContext): Tile {
	const { player, visible, rng } = ctx;
	const counts = countKinds(player.hand);
	const meldCount = meldUnits(player);

	let bestTile = player.hand[0];
	let bestScore = -Infinity;
	const seen = new Set<Kind>();

	for (const tile of player.hand) {
		if (seen.has(tile.kind)) continue;
		seen.add(tile.kind);
		counts[tile.kind] -= 1;
		const s = shanten(counts, meldCount);
		const u = ukeire(counts, meldCount, visible);
		const keep = keepValue(tile.kind, counts, ctx.seatWind, ctx.roundWind);
		counts[tile.kind] += 1;

		const score = -s * 1000 + u * 6 - keep * 3 + rng() * 2;
		if (score > bestScore) {
			bestScore = score;
			bestTile = tile;
		}
	}
	return bestTile;
}

/**
 * Claim policy: always take a win, take a pung/kong when it moves the hand
 * forward, and only chow when it clearly helps.
 */
export function chooseClaim(
	ctx: AiContext,
	options: ClaimOption[],
	discarded: Kind,
): ClaimOption | null {
	const { player, rng } = ctx;
	const win = options.find((o) => o.type === "win");
	if (win) return win;

	const counts = countKinds(player.hand);
	const meldCount = meldUnits(player);
	const current = shanten(counts, meldCount);

	const kong = options.find((o) => o.type === "kong");
	if (kong) {
		const after = [...counts];
		after[discarded] -= 3;
		if (shanten(after, meldCount + 1) <= current) return kong;
	}

	const pung = options.find((o) => o.type === "pung");
	if (pung) {
		const after = [...counts];
		after[discarded] -= 2;
		const next = shanten(after, meldCount + 1);
		const valuable =
			isDragon(discarded) ||
			(isWind(discarded) &&
				(discarded - WIND_EAST === ctx.seatWind ||
					discarded - WIND_EAST === ctx.roundWind));
		if (next < current || (next === current && (valuable || current <= 2)))
			return pung;
	}

	const chow = options.find((o) => o.type === "chow");
	if (chow?.tiles) {
		const after = [...counts];
		for (const tile of chow.tiles) after[tile.kind] -= 1;
		const next = shanten(after, meldCount + 1);
		// A chow that does not advance the hand mostly leaks information, so
		// only take a clear improvement (with a little variety between hands).
		if (next < current && (current <= 3 || rng() < 0.5)) return chow;
	}

	return null;
}

/** Whether an AI should turn four concealed tiles into a kong on its turn. */
export function shouldDeclareKong(ctx: AiContext, kind: Kind): boolean {
	const counts = countKinds(ctx.player.hand);
	const meldCount = meldUnits(ctx.player);
	const before = shanten(counts, meldCount);
	const after = [...counts];
	after[kind] -= 4;
	return shanten(after, meldCount + 1) <= before;
}

/** Convenience for the UI: which chow shapes a hand can make with a tile. */
export function chowOptionsFor(hand: Tile[], kind: Kind): [Kind, Kind][] {
	return chowPairs(countKinds(hand), kind);
}

export function isSafeish(kind: Kind): boolean {
	return isTerminalOrHonor(kind);
}
