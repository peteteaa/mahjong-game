import "./App.css";
import { useEffect } from "react";
import { HomeScreen } from "@/components/hud/HomeScreen";
import { Hud } from "@/components/hud/Hud";
import { GameOver, HandResult } from "@/components/hud/Results";
import { Scene, TABLE_BG } from "@/components/three/Scene";
import { useAutoPlay } from "@/hooks/useAutoPlay";
import { SPEED_PRESETS, useGameStore } from "@/store/gameStore";

const params = () =>
	new URLSearchParams(
		typeof window === "undefined" ? "" : window.location.search,
	);

/**
 * `?play=1&seed=42&faan=3&hands=8` deals immediately — handy for replaying a
 * deal. `?speed=2` (or `?fast=1` for the quickest preset) sets the table speed.
 */
function useUrlGame() {
	const startGame = useGameStore((s) => s.startGame);
	const setSpeed = useGameStore((s) => s.setSpeed);
	useEffect(() => {
		const search = params();
		const fastest = SPEED_PRESETS[SPEED_PRESETS.length - 1].value;
		if (search.has("fast")) setSpeed(fastest);
		else if (search.has("speed")) {
			const asked = Number(search.get("speed"));
			const match = SPEED_PRESETS.find((preset) => preset.value === asked);
			if (match) setSpeed(match.value);
		}
		if (!search.has("play")) return;
		const number = (key: string, fallback: number) => {
			const raw = search.get(key);
			const value = raw === null ? Number.NaN : Number(raw);
			return Number.isFinite(value) ? value : fallback;
		};
		startGame({
			minFaan: number("faan", 1),
			hands: number("hands", 4),
			seed: search.has("seed") ? number("seed", 1) : undefined,
		});
	}, [startGame, setSpeed]);
}

export default function App() {
	const phase = useGameStore((s) => s.phase);
	useUrlGame();
	useAutoPlay(params().has("auto"));

	return (
		<main
			className="relative h-screen w-screen overflow-hidden"
			style={{ backgroundColor: TABLE_BG }}
		>
			{phase === "home" ? (
				<HomeScreen />
			) : (
				<>
					<Scene />
					<Hud />
					{phase === "handOver" && <HandResult />}
					{phase === "gameOver" && <GameOver />}
				</>
			)}
		</main>
	);
}
