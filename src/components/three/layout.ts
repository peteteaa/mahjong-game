import type { Meld, Tile } from "@/game/types";

/**
 * Table layout in seat-local space: the seat sits at +Z looking toward origin.
 * Every row has to stay inside the seat's wedge (|x| < z) or it collides with
 * the neighbouring seat's rows at the corners of the table.
 */
export const LAYOUT = {
	handZ: 9.3,
	handStep: 1.16,
	drawnGap: 0.55,
	meldZ: 7.6,
	meldStep: 1.16,
	meldGap: 0.45,
	meldRight: 6.2,
	bonusZ: 6.9,
	bonusLeft: -6.0,
	bonusStep: 0.95,
	discardZ: 5.4,
	discardRow: 1.7,
	discardStep: 1.16,
	discardPerRow: 7,
	markerZ: 8.45,
};

export function handPositions(count: number, hasDrawn: boolean): number[] {
	const step = LAYOUT.handStep;
	const width = count * step + (hasDrawn ? LAYOUT.drawnGap : 0);
	const start = -width / 2 + step / 2;
	const xs: number[] = [];
	for (let i = 0; i < count; i++) {
		const gap = hasDrawn && i === count - 1 ? LAYOUT.drawnGap : 0;
		xs.push(start + i * step + gap);
	}
	return xs;
}

export function discardPosition(index: number): [number, number] {
	const row = Math.floor(index / LAYOUT.discardPerRow);
	const col = index % LAYOUT.discardPerRow;
	const x = (col - (LAYOUT.discardPerRow - 1) / 2) * LAYOUT.discardStep;
	const z = LAYOUT.discardZ - row * LAYOUT.discardRow;
	return [x, z];
}

export interface PlacedMeldTile {
	tile: Tile;
	x: number;
	faceDown: boolean;
}

/** Lays exposed sets out from the right-hand side of the seat's meld row. */
export function meldPlacements(melds: Meld[]): PlacedMeldTile[] {
	const placed: PlacedMeldTile[] = [];
	let cursor = LAYOUT.meldRight;
	for (const meld of melds) {
		const tiles = meld.tiles;
		tiles.forEach((tile, index) => {
			const x = cursor - (tiles.length - index - 0.5) * LAYOUT.meldStep;
			// A concealed kong is shown with its two outer tiles turned down.
			const faceDown =
				meld.concealed &&
				meld.type === "kong" &&
				(index === 0 || index === tiles.length - 1);
			placed.push({ tile, x, faceDown });
		});
		cursor -= tiles.length * LAYOUT.meldStep + LAYOUT.meldGap;
	}
	return placed;
}
