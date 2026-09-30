import {
	type Decomposition,
	type SetPart,
	decompose,
	isNineGates,
	isThirteenOrphans,
} from "./melds";
import {
	DRAGON_RED,
	WIND_EAST,
	countKinds,
	isDragon,
	isHonor,
	isTerminalOrHonor,
	isWind,
	suitOf,
} from "./tiles";
import type {
	BonusTile,
	HandScore,
	Kind,
	Meld,
	ScoredPattern,
	Seat,
	Tile,
} from "./types";

export const LIMIT_FAAN = 13;

/** Classic Hong Kong "faan to points" ladder, capped at the 13-faan limit. */
const POINT_LADDER = [1, 2, 4, 8, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384];

export function pointsForFaan(faan: number): number {
	return POINT_LADDER[Math.min(faan, LIMIT_FAAN)];
}

export interface ScoreContext {
	concealed: Tile[];
	melds: Meld[];
	bonus: BonusTile[];
	winningTile: Kind;
	seatWind: Seat;
	roundWind: Seat;
	selfDraw: boolean;
	/** Won on the replacement tile after declaring a kong. */
	afterKong?: boolean;
	/** Won by robbing the tile another player added to an exposed pung. */
	robbedKong?: boolean;
	/** Won on the very last drawable tile of the wall. */
	lastTile?: boolean;
}

interface Block extends SetPart {
	kong?: boolean;
	exposed?: boolean;
}

function meldToBlock(meld: Meld): Block {
	return {
		type: meld.type === "chow" ? "chow" : "pung",
		kinds: meld.type === "kong" ? meld.kinds.slice(0, 3) : meld.kinds,
		kong: meld.type === "kong",
		exposed: !meld.concealed,
	};
}

function scoreBlocks(
	blocks: Block[],
	pair: Kind,
	ctx: ScoreContext,
): ScoredPattern[] {
	const patterns: ScoredPattern[] = [];
	const add = (name: string, faan: number) => patterns.push({ name, faan });

	const allKinds: Kind[] = [...blocks.flatMap((b) => b.kinds), pair, pair];
	const pungs = blocks.filter((b) => b.type === "pung");
	const chows = blocks.filter((b) => b.type === "chow");
	const kongs = blocks.filter((b) => b.kong);
	const suits = new Set(allKinds.filter((k) => !isHonor(k)).map(suitOf));
	const hasHonor = allKinds.some(isHonor);
	const windPungs = pungs.filter((b) => isWind(b.kinds[0]));
	const dragonPungs = pungs.filter((b) => isDragon(b.kinds[0]));
	const concealedHand =
		ctx.melds.every((m) => m.concealed) && !ctx.selfDraw;
	const fullyConcealed = ctx.melds.every((m) => m.concealed);

	const allHonors = allKinds.every(isHonor);
	const allTerminals = allKinds.every(
		(k) => !isHonor(k) && isTerminalOrHonor(k),
	);
	const mixedOrphans =
		!allHonors &&
		!allTerminals &&
		allKinds.every(isTerminalOrHonor) &&
		chows.length === 0;

	// Big hands first; each is self-contained enough that the 13-faan cap sorts
	// out any generous overlap.
	if (allHonors) add("All Honours (字一色)", 10);
	if (allTerminals) add("All Terminals (清老頭)", 13);
	if (mixedOrphans) add("Mixed Orphans (混老頭)", 10);

	if (windPungs.length === 4) add("Great Four Winds (大四喜)", 13);
	else if (windPungs.length === 3 && isWind(pair))
		add("Small Four Winds (小四喜)", 10);

	if (dragonPungs.length === 3) add("Great Three Dragons (大三元)", 8);
	else if (dragonPungs.length === 2 && isDragon(pair))
		add("Small Three Dragons (小三元)", 5);

	if (kongs.length === 4) add("Four Kongs (十八羅漢)", 13);

	if (!allHonors && !allTerminals && !mixedOrphans) {
		if (suits.size === 1 && !hasHonor) add("Full Flush (清一色)", 7);
		else if (suits.size === 1 && hasHonor) add("Half Flush (混一色)", 3);
	}

	if (pungs.length === 4 && !allHonors && !allTerminals && !mixedOrphans)
		add("All Pungs (對對糊)", 3);

	if (
		chows.length === 4 &&
		!isDragon(pair) &&
		pair !== WIND_EAST + ctx.seatWind &&
		pair !== WIND_EAST + ctx.roundWind
	)
		add("All Chows (平糊)", 1);

	for (const pung of dragonPungs) {
		const names = ["Red", "Green", "White"];
		add(`${names[pung.kinds[0] - DRAGON_RED]} Dragon pung`, 1);
	}
	for (const pung of windPungs) {
		const wind = pung.kinds[0] - WIND_EAST;
		if (wind === ctx.seatWind) add("Seat Wind pung (門風)", 1);
		if (wind === ctx.roundWind) add("Round Wind pung (圈風)", 1);
	}

	if (concealedHand) add("Fully Concealed (門前清)", 1);
	if (ctx.selfDraw && fullyConcealed) add("Self-drawn & concealed (門清自摸)", 2);
	else if (ctx.selfDraw) add("Self-drawn (自摸)", 1);

	if (ctx.afterKong) add("Win on kong replacement (槓上開花)", 1);
	if (ctx.robbedKong) add("Robbing a kong (搶槓)", 1);
	if (ctx.lastTile) add("Last tile of the wall (海底撈月)", 1);

	// Bonus tiles: one faan for each flower or season matching the seat wind,
	// two more for holding a full set of four.
	const flowers = ctx.bonus.filter((b) => b.group === "flower");
	const seasons = ctx.bonus.filter((b) => b.group === "season");
	for (const bonus of ctx.bonus) {
		if (bonus.number === ctx.seatWind + 1)
			add(`Own ${bonus.group} (${bonus.number})`, 1);
	}
	if (flowers.length === 4) add("All four flowers", 2);
	if (seasons.length === 4) add("All four seasons", 2);

	return patterns;
}

function totalFaan(patterns: ScoredPattern[]): number {
	return patterns.reduce((sum, p) => sum + p.faan, 0);
}

/** Picks the highest-scoring way to read the winning hand. */
export function scoreHand(ctx: ScoreContext): HandScore {
	const counts = countKinds(ctx.concealed);
	const exposedBlocks = ctx.melds.map(meldToBlock);

	const specials: ScoredPattern[][] = [];
	if (ctx.melds.length === 0) {
		if (isThirteenOrphans(counts))
			specials.push([{ name: "Thirteen Orphans (十三么)", faan: 13 }]);
		if (isNineGates(counts))
			specials.push([{ name: "Nine Gates (九蓮寶燈)", faan: 10 }]);
	}

	const options: ScoredPattern[][] = [...specials];
	const decompositions: Decomposition[] = decompose(
		counts,
		4 - ctx.melds.length,
	);
	for (const dec of decompositions) {
		const blocks: Block[] = [
			...exposedBlocks,
			...dec.sets.map((set) => ({ ...set, exposed: false })),
		];
		options.push(scoreBlocks(blocks, dec.pair, ctx));
	}

	if (options.length === 0) {
		return { faan: 0, patterns: [], points: 0, limit: false };
	}

	let best = options[0];
	for (const option of options) {
		if (totalFaan(option) > totalFaan(best)) best = option;
	}

	const raw = totalFaan(best);
	const faan = Math.min(raw, LIMIT_FAAN);
	return {
		faan,
		patterns: best.sort((a, b) => b.faan - a.faan),
		points: pointsForFaan(faan),
		limit: raw >= LIMIT_FAAN,
	};
}
