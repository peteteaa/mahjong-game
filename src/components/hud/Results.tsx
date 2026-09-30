import { ArrowRight, Home, RotateCcw, Trophy } from "lucide-react";
import { shortLabel } from "@/game/tiles";
import type { Meld, Player } from "@/game/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameStore } from "@/store/gameStore";

function TileText({ label, muted }: { label: string; muted?: boolean }) {
	return (
		<span
			className={`rounded px-1.5 py-0.5 font-mono text-sm ${
				muted ? "bg-white/5 text-emerald-200/70" : "bg-white/10 text-emerald-50"
			}`}
		>
			{label}
		</span>
	);
}

function WinningHand({ player }: { player: Player }) {
	const concealed = [...player.hand].sort((a, b) => a.kind - b.kind);
	return (
		<div className="space-y-2">
			<div className="flex flex-wrap gap-1">
				{concealed.map((tile) => (
					<TileText key={tile.id} label={shortLabel(tile.kind)} />
				))}
			</div>
			{player.melds.length > 0 && (
				<div className="flex flex-wrap gap-3">
					{player.melds.map((meld: Meld, index) => (
						<div
							key={`${meld.type}-${index}-${meld.kinds.join()}`}
							className="flex gap-1 rounded-md border border-white/10 p-1"
						>
							{meld.kinds.map((kind, position) => (
								<TileText
									key={`${kind}-${position}`}
									label={shortLabel(kind)}
									muted
								/>
							))}
						</div>
					))}
				</div>
			)}
			{player.bonus.length > 0 && (
				<div className="flex flex-wrap gap-1 text-xs text-emerald-200/70">
					{player.bonus.map((bonus) => (
						<span key={bonus.id} className="rounded bg-white/5 px-1.5 py-0.5">
							{bonus.group} {bonus.number}
						</span>
					))}
				</div>
			)}
		</div>
	);
}

export function HandResult() {
	const result = useGameStore((s) => s.result);
	const players = useGameStore((s) => s.players);
	const handNumber = useGameStore((s) => s.handNumber);
	const maxHands = useGameStore((s) => s.maxHands);
	const nextHand = useGameStore((s) => s.nextHand);
	if (!result) return null;

	const winner = result.winner !== undefined ? players[result.winner] : null;
	const isYou = result.winner === 0;

	return (
		<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 p-6 backdrop-blur-sm">
			<Card className="w-full max-w-xl border-emerald-300/15 bg-emerald-950/95 text-emerald-50 shadow-2xl">
				<CardHeader>
					<CardTitle className="flex items-center gap-3 text-2xl">
						{result.kind === "draw" ? (
							"Washed out"
						) : (
							<>
								<Trophy
									className={`h-6 w-6 ${isYou ? "text-amber-300" : "text-emerald-300"}`}
								/>
								{isYou ? "You win the hand" : `${winner?.name} wins the hand`}
							</>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-5">
					{result.kind === "draw" ? (
						<p className="text-sm text-emerald-200/75">
							The wall ran out before anyone went out. No points change hands.
						</p>
					) : (
						<>
							<p className="text-sm text-emerald-200/75">
								{result.selfDraw
									? "Self-drawn — everyone pays."
									: result.loser === 0
										? "Won on your discard."
										: `Won on ${players[result.loser ?? 0].name}'s discard.`}
							</p>

							{winner && <WinningHand player={winner} />}

							<div className="space-y-1.5 rounded-lg border border-white/10 bg-black/20 p-3">
								{result.score?.patterns.map((pattern) => (
									<div
										key={pattern.name}
										className="flex justify-between text-sm"
									>
										<span className="text-emerald-100/85">{pattern.name}</span>
										<span className="font-mono text-emerald-300">
											{pattern.faan}
										</span>
									</div>
								))}
								<div className="mt-2 flex justify-between border-t border-white/10 pt-2 text-base font-semibold">
									<span>
										{result.score?.faan} faan
										{result.score?.limit ? " (limit)" : ""}
									</span>
									<span className="font-mono text-amber-300">
										{result.score?.points} pts
									</span>
								</div>
							</div>
						</>
					)}

					<div className="grid grid-cols-4 gap-2 text-center text-sm">
						{players.map((player) => {
							const delta = result.deltas[player.seat];
							return (
								<div
									key={player.seat}
									className="rounded-lg border border-white/10 bg-white/5 p-2"
								>
									<div className="text-xs text-emerald-200/70">
										{player.name}
									</div>
									<div
										className={`font-mono ${
											delta > 0
												? "text-emerald-300"
												: delta < 0
													? "text-rose-300"
													: "text-emerald-100/60"
										}`}
									>
										{delta > 0 ? "+" : ""}
										{delta}
									</div>
								</div>
							);
						})}
					</div>

					<Button
						className="w-full bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
						onClick={nextHand}
					>
						{handNumber >= maxHands ? "Final standings" : "Next hand"}
						<ArrowRight className="ml-2 h-4 w-4" />
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}

export function GameOver() {
	const players = useGameStore((s) => s.players);
	const minFaan = useGameStore((s) => s.minFaan);
	const maxHands = useGameStore((s) => s.maxHands);
	const startGame = useGameStore((s) => s.startGame);
	const goHome = useGameStore((s) => s.goHome);

	const standings = [...players].sort((a, b) => b.points - a.points);

	return (
		<div className="absolute inset-0 z-20 flex items-center justify-center bg-black/65 p-6 backdrop-blur">
			<Card className="w-full max-w-md border-emerald-300/15 bg-emerald-950/95 text-emerald-50 shadow-2xl">
				<CardHeader>
					<CardTitle className="text-2xl">Final standings</CardTitle>
				</CardHeader>
				<CardContent className="space-y-5">
					<ol className="space-y-2">
						{standings.map((player, index) => (
							<li
								key={player.seat}
								className={`flex items-center justify-between rounded-lg border p-3 ${
									index === 0
										? "border-amber-300/50 bg-amber-400/10"
										: "border-white/10 bg-white/5"
								}`}
							>
								<span className="flex items-center gap-2">
									<span className="w-5 text-center font-mono text-emerald-300/70">
										{index + 1}
									</span>
									{player.name}
								</span>
								<span className="font-mono">
									{player.points >= 0 ? "+" : ""}
									{player.points}
								</span>
							</li>
						))}
					</ol>
					<div className="flex gap-3">
						<Button
							className="flex-1 bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
							onClick={() => startGame({ minFaan, hands: maxHands })}
						>
							<RotateCcw className="mr-2 h-4 w-4" />
							Play again
						</Button>
						<Button
							variant="outline"
							className="border-white/15 bg-white/5 text-emerald-50 hover:bg-white/10"
							onClick={goHome}
						>
							<Home className="mr-2 h-4 w-4" />
							Menu
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
