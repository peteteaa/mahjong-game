import type { BonusTile, Kind, Suit, Tile } from "./types";

export const KIND_COUNT = 34;

export const WIND_EAST = 27;
export const WIND_SOUTH = 28;
export const WIND_WEST = 29;
export const WIND_NORTH = 30;
export const DRAGON_RED = 31;
export const DRAGON_GREEN = 32;
export const DRAGON_WHITE = 33;

const SUIT_TEXTURES = ["Man", "Pin", "Sou"] as const;
const HONOR_TEXTURES = [
	"East",
	"South",
	"West",
	"North",
	"Chun",
	"Hatsu",
	"Haku",
] as const;
const HONOR_NAMES = [
	"East Wind",
	"South Wind",
	"West Wind",
	"North Wind",
	"Red Dragon",
	"Green Dragon",
	"White Dragon",
] as const;
const SUIT_NAMES = ["Characters", "Dots", "Bamboo"] as const;

export function isHonor(kind: Kind): boolean {
	return kind >= 27;
}

export function isWind(kind: Kind): boolean {
	return kind >= 27 && kind <= 30;
}

export function isDragon(kind: Kind): boolean {
	return kind >= 31;
}

/** Terminals are the 1s and 9s of the three numbered suits. */
export function isTerminal(kind: Kind): boolean {
	return !isHonor(kind) && (kind % 9 === 0 || kind % 9 === 8);
}

export function isTerminalOrHonor(kind: Kind): boolean {
	return isHonor(kind) || isTerminal(kind);
}

export function suitOf(kind: Kind): Suit {
	if (kind >= 27) return "honor";
	if (kind >= 18) return "sou";
	if (kind >= 9) return "pin";
	return "man";
}

/** 1-9 for numbered suits, 0 for honors. */
export function rankOf(kind: Kind): number {
	return isHonor(kind) ? 0 : (kind % 9) + 1;
}

/** The PNG basename under /textures/Regular for a playable tile. */
export function textureFor(kind: Kind): string {
	if (kind >= 27) return HONOR_TEXTURES[kind - 27];
	return `${SUIT_TEXTURES[Math.floor(kind / 9)]}${(kind % 9) + 1}`;
}

/** Flowers ship as "Bamboo1-4" in this tile set; seasons as "Season1-4". */
export function bonusTextureFor(bonus: BonusTile): string {
	return bonus.group === "flower"
		? `Bamboo${bonus.number}`
		: `Season${bonus.number}`;
}

export function nameOf(kind: Kind): string {
	if (kind >= 27) return HONOR_NAMES[kind - 27];
	return `${(kind % 9) + 1} ${SUIT_NAMES[Math.floor(kind / 9)]}`;
}

export function shortLabel(kind: Kind): string {
	if (kind >= 27) return ["E", "S", "W", "N", "中", "發", "白"][kind - 27];
	return `${(kind % 9) + 1}${["m", "p", "s"][Math.floor(kind / 9)]}`;
}

export const ALL_TEXTURE_NAMES: string[] = [
	...Array.from({ length: 34 }, (_, k) => textureFor(k)),
	"Bamboo1",
	"Bamboo2",
	"Bamboo3",
	"Bamboo4",
	"Season1",
	"Season2",
	"Season3",
	"Season4",
];

/** Sorting used for the player's concealed hand: by suit then rank. */
export function sortHand(tiles: Tile[]): Tile[] {
	return [...tiles].sort((a, b) => a.kind - b.kind || a.id.localeCompare(b.id));
}

export function countKinds(tiles: Tile[]): number[] {
	const counts = new Array<number>(KIND_COUNT).fill(0);
	for (const tile of tiles) counts[tile.kind] += 1;
	return counts;
}

export function removeTile(tiles: Tile[], id: string): Tile[] {
	const index = tiles.findIndex((t) => t.id === id);
	if (index < 0) return tiles;
	const next = [...tiles];
	next.splice(index, 1);
	return next;
}

/** Pulls `count` tiles of a given kind out of a hand, returning them and the rest. */
export function takeKind(
	tiles: Tile[],
	kind: Kind,
	count: number,
): { taken: Tile[]; rest: Tile[] } {
	const taken: Tile[] = [];
	const rest: Tile[] = [];
	for (const tile of tiles) {
		if (tile.kind === kind && taken.length < count) taken.push(tile);
		else rest.push(tile);
	}
	return { taken, rest };
}
