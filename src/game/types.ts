/** Core domain types for the Hong Kong mahjong game. */

/**
 * Playable tile kinds are indexed 0-33:
 *   0-8   characters (man)  1-9
 *   9-17  dots (pin)        1-9
 *   18-26 bamboo (sou)      1-9
 *   27-30 winds            East, South, West, North
 *   31-33 dragons          Red, Green, White
 * Bonus tiles (flowers / seasons) live outside this range, see `BonusTile`.
 */
export type Kind = number;

export type Suit = "man" | "pin" | "sou" | "honor";

export interface Tile {
	/** Stable identity, used for React keys and 3D animation continuity. */
	id: string;
	kind: Kind;
}

export interface BonusTile {
	id: string;
	/** "flower" or "season" */
	group: "flower" | "season";
	/** 1-4, matching the seat wind of the same number (1 = East ... 4 = North). */
	number: number;
}

export type MeldType = "chow" | "pung" | "kong";

export interface Meld {
	type: MeldType;
	/** Sorted tile kinds making up the meld. */
	kinds: Kind[];
	tiles: Tile[];
	/** A concealed kong is still "concealed"; anything claimed is exposed. */
	concealed: boolean;
	/** Seat the claimed tile came from, when exposed. */
	from?: number;
}

/** Seats are 0-3 in turn order; play moves 0 -> 1 -> 2 -> 3 -> 0 (counter-clockwise). */
export type Seat = number;

export interface Player {
	seat: Seat;
	name: string;
	isHuman: boolean;
	hand: Tile[];
	melds: Meld[];
	bonus: BonusTile[];
	discards: Tile[];
	points: number;
}

export type ClaimType = "chow" | "pung" | "kong" | "win";

export interface ClaimOption {
	type: ClaimType;
	seat: Seat;
	/** For a chow, the two hand tiles that complete the run. */
	tiles?: Tile[];
	/** Human-readable label for the claim button. */
	label: string;
	/** What the hand would score, for a winning claim. */
	faan?: number;
}

export interface ScoredPattern {
	name: string;
	faan: number;
}

export interface HandScore {
	faan: number;
	patterns: ScoredPattern[];
	points: number;
	limit: boolean;
}

export interface HandResult {
	kind: "win" | "draw";
	winner?: Seat;
	/** Seat that discarded the winning tile; undefined on a self-draw. */
	loser?: Seat;
	selfDraw?: boolean;
	score?: HandScore;
	/** Point delta applied to each seat. */
	deltas: number[];
}
