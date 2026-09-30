import { Html } from "@react-three/drei";
import { memo } from "react";
import { bonusTextureFor, sortHand, textureFor } from "@/game/tiles";
import type { Player, Seat } from "@/game/types";
import { WIND_NAMES, useGameStore } from "@/store/gameStore";
import { Tile3D } from "./Tile3D";
import { LAYOUT, discardPosition, handPositions, meldPlacements } from "./layout";
import { TILE, type TileAssets, useTileAssets } from "./tileAssets";

const FLAT_Y = TILE.thickness / 2;
const STAND_Y = TILE.height / 2;

function SeatLabel({
	player,
	wind,
	active,
}: {
	player: Player;
	wind: number;
	active: boolean;
}) {
	return (
		<Html
			position={[0, 0.2, LAYOUT.handZ + 1.9]}
			center
			distanceFactor={18}
			zIndexRange={[5, 0]}
			style={{ pointerEvents: "none" }}
		>
			<div
				className={`flex items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1 text-sm font-medium backdrop-blur-sm transition-colors ${
					active
						? "border-amber-300/70 bg-amber-400/20 text-amber-100"
						: "border-white/10 bg-black/40 text-emerald-50/80"
				}`}
			>
				<span className="font-semibold">{player.name}</span>
				<span className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
					{WIND_NAMES[wind]}
				</span>
				<span className="tabular-nums text-xs opacity-80">
					{player.points >= 0 ? "+" : ""}
					{player.points}
				</span>
			</div>
		</Html>
	);
}

const SeatTiles = memo(function SeatTiles({
	assets,
	player,
	wind,
	active,
	interactive,
	drawnTileId,
	lastDiscardId,
}: {
	assets: TileAssets;
	player: Player;
	wind: number;
	active: boolean;
	interactive: boolean;
	drawnTileId: string | null;
	lastDiscardId: string | null;
}) {
	const discard = useGameStore((s) => s.humanDiscard);
	const flatHand = useGameStore((s) => s.flatHand);
	const seatYaw = (player.seat * Math.PI) / 2;
	// Cancels the seat rotation, for the tiles that are turned to the camera.
	const faceCamera = -seatYaw;

	const drawn = player.hand.find((t) => t.id === drawnTileId) ?? null;
	const resting = drawn
		? sortHand(player.hand.filter((t) => t.id !== drawn.id))
		: sortHand(player.hand);
	const ordered = drawn ? [...resting, drawn] : resting;
	const xs = handPositions(ordered.length, Boolean(drawn));

	return (
		<group rotation={[0, seatYaw, 0]}>
			{ordered.map((tile, index) => (
				<Tile3D
					key={tile.id}
					assets={assets}
					texture={player.isHuman ? textureFor(tile.kind) : undefined}
					position={[xs[index], flatHand ? FLAT_Y : STAND_Y, LAYOUT.handZ]}
					standing={!flatHand}
					selectable={interactive}
					onSelect={interactive ? () => discard(tile.id) : undefined}
				/>
			))}

			{meldPlacements(player.melds).map(({ tile, x, faceDown }) => (
				<Tile3D
					key={tile.id}
					assets={assets}
					texture={faceDown ? undefined : textureFor(tile.kind)}
					position={[x, FLAT_Y, LAYOUT.meldZ]}
					yaw={faceCamera}
				/>
			))}

			{player.bonus.map((bonus, index) => (
				<Tile3D
					key={bonus.id}
					assets={assets}
					texture={bonusTextureFor(bonus)}
					position={[
						LAYOUT.bonusLeft + index * LAYOUT.bonusStep,
						FLAT_Y,
						LAYOUT.bonusZ,
					]}
					yaw={faceCamera}
				/>
			))}

			{/* Discards keep the seat's own orientation, the way they would lie on
			    a real table: each player's pool reads from where they sit. */}
			{player.discards.map((tile, index) => {
				const [x, z] = discardPosition(index);
				return (
					<Tile3D
						key={tile.id}
						assets={assets}
						texture={textureFor(tile.kind)}
						position={[x, FLAT_Y, z]}
						highlight={tile.id === lastDiscardId}
					/>
				);
			})}

			{active && (
				<mesh
					position={[0, 0.02, LAYOUT.markerZ]}
					rotation={[-Math.PI / 2, 0, 0]}
				>
					<planeGeometry args={[6, 0.4]} />
					<meshBasicMaterial color="#ffd166" transparent opacity={0.75} />
				</mesh>
			)}

			{!player.isHuman && (
				<SeatLabel player={player} wind={wind} active={active} />
			)}
		</group>
	);
});

export function Table() {
	const assets = useTileAssets();
	const players = useGameStore((s) => s.players);
	const turn = useGameStore((s) => s.turn);
	const awaiting = useGameStore((s) => s.awaiting);
	const drawnTileId = useGameStore((s) => s.drawnTileId);
	const lastDiscard = useGameStore((s) => s.lastDiscard);
	const dealer = useGameStore((s) => s.dealer);
	const wall = useGameStore((s) => s.wall);

	const canDiscard = awaiting === "turn" && turn === 0;

	return (
		<group>
			{/* Felt table top */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
				<planeGeometry args={[60, 60]} />
				<meshStandardMaterial color="#0f4033" roughness={0.95} />
			</mesh>
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
				<circleGeometry args={[11.5, 64]} />
				<meshStandardMaterial color="#12523f" roughness={0.9} />
			</mesh>

			<Html position={[0, 0.05, 0]} center distanceFactor={16} zIndexRange={[4, 0]}>
				<div className="pointer-events-none select-none text-center text-emerald-100/70">
					<div className="text-3xl font-semibold tabular-nums">{wall.length}</div>
					<div className="text-[10px] uppercase tracking-[0.25em]">
						tiles left
					</div>
				</div>
			</Html>

			{players.map((player: Player) => (
				<SeatTiles
					key={player.seat}
					assets={assets}
					player={player}
					wind={(player.seat - dealer + 4) % 4}
					active={turn === (player.seat as Seat)}
					interactive={player.isHuman && canDiscard}
					drawnTileId={player.isHuman ? drawnTileId : null}
					lastDiscardId={lastDiscard?.tile.id ?? null}
				/>
			))}
		</group>
	);
}
