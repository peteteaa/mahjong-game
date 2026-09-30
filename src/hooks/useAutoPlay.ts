import { useEffect } from "react";
import { chooseClaim, chooseDiscard } from "@/game/ai";
import { countKinds } from "@/game/tiles";
import { useGameStore } from "@/store/gameStore";

/**
 * Demo mode: lets the computer take the human seat as well, so the table can be
 * watched (or screenshotted) playing itself. Enabled with `?auto=1`; the table
 * speed setting controls how fast it runs.
 */
export function useAutoPlay(enabled: boolean) {
	const speed = useGameStore((s) => s.speed);
	useEffect(() => {
		if (!enabled) return;
		const intervalMs = Math.max(80, 700 / speed);
		const timer = setInterval(() => {
			// The result card is left up at the end of a hand so it can be read.
			const state = useGameStore.getState();
			if (state.phase !== "playing") return;

			const context = {
				player: state.players[0],
				visible: countKinds(state.players[0].hand),
				seatWind: state.seatWind(0),
				roundWind: state.roundWind,
				rng: Math.random,
			};

			if (state.awaiting === "turn" && state.turn === 0) {
				const win = state.turnActions.find((a) => a.type === "win");
				if (win) {
					state.humanTurnAction(win);
					return;
				}
				state.humanDiscard(chooseDiscard(context).id);
				return;
			}
			if (state.awaiting === "claim" && state.lastDiscard) {
				const choice = chooseClaim(
					context,
					state.claimOptions,
					state.lastDiscard.tile.kind,
				);
				if (choice) state.humanClaim(choice);
				else state.humanPass();
			}
		}, intervalMs);
		return () => clearInterval(timer);
	}, [enabled, speed]);
}
