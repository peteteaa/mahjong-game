import { type Rng, shuffle } from "./random";
import { KIND_COUNT } from "./tiles";
import type { BonusTile, Tile } from "./types";

export interface WallTile {
	tile?: Tile;
	bonus?: BonusTile;
}

/**
 * A Hong Kong wall: 34 kinds x 4 copies (136) plus 4 flowers and 4 seasons = 144.
 */
export function buildWall(rng: Rng): WallTile[] {
	const wall: WallTile[] = [];
	let serial = 0;
	for (let kind = 0; kind < KIND_COUNT; kind++) {
		for (let copy = 0; copy < 4; copy++) {
			wall.push({ tile: { id: `t${serial++}`, kind } });
		}
	}
	for (let number = 1; number <= 4; number++) {
		wall.push({ bonus: { id: `b${serial++}`, group: "flower", number } });
		wall.push({ bonus: { id: `b${serial++}`, group: "season", number } });
	}
	return shuffle(wall, rng);
}
