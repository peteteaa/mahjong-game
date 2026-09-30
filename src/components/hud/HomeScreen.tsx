import { BookOpen, Play } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useGameStore } from "@/store/gameStore";
import { RulesPanel } from "./RulesPanel";
import { SettingToggle } from "./SettingToggle";
import { SpeedControl } from "./SpeedControl";

const FAAN_CHOICES = [
	{ value: 0, label: "0 faan", hint: "Chicken hands allowed" },
	{ value: 1, label: "1 faan", hint: "Friendly minimum" },
	{ value: 3, label: "3 faan", hint: "Classic Hong Kong" },
];

const HAND_CHOICES = [2, 4, 8];

export function HomeScreen() {
	const startGame = useGameStore((s) => s.startGame);
	const showCallButtons = useGameStore((s) => s.showCallButtons);
	const setShowCallButtons = useGameStore((s) => s.setShowCallButtons);
	const [minFaan, setMinFaan] = useState(1);
	const [hands, setHands] = useState(4);
	const [showRules, setShowRules] = useState(false);

	return (
		<div className="relative flex h-full w-full items-center justify-center p-6">
			<Card className="w-full max-w-lg border-emerald-300/15 bg-emerald-950/80 text-emerald-50 shadow-2xl backdrop-blur">
				<CardHeader>
					<CardTitle className="text-3xl font-semibold tracking-tight">
						Hong Kong Mahjong
					</CardTitle>
					<CardDescription className="text-emerald-200/70">
						Draw, discard and call your way to four sets and a pair against
						three computer players. Scoring is faan-based, old-style.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<div className="text-xs uppercase tracking-[0.2em] text-emerald-300/70">
							Minimum faan to win
						</div>
						<div className="grid grid-cols-3 gap-2">
							{FAAN_CHOICES.map((choice) => (
								<button
									key={choice.value}
									type="button"
									onClick={() => setMinFaan(choice.value)}
									className={`rounded-lg border p-3 text-left transition-colors ${
										minFaan === choice.value
											? "border-amber-300/60 bg-amber-400/15"
											: "border-white/10 bg-white/5 hover:bg-white/10"
									}`}
								>
									<div className="text-sm font-semibold">{choice.label}</div>
									<div className="text-[11px] text-emerald-200/60">
										{choice.hint}
									</div>
								</button>
							))}
						</div>
					</div>

					<div className="space-y-2">
						<div className="text-xs uppercase tracking-[0.2em] text-emerald-300/70">
							Hands per game
						</div>
						<div className="grid grid-cols-3 gap-2">
							{HAND_CHOICES.map((count) => (
								<button
									key={count}
									type="button"
									onClick={() => setHands(count)}
									className={`rounded-lg border p-3 text-sm font-semibold transition-colors ${
										hands === count
											? "border-amber-300/60 bg-amber-400/15"
											: "border-white/10 bg-white/5 hover:bg-white/10"
									}`}
								>
									{count}
								</button>
							))}
						</div>
					</div>

					<SpeedControl />

					<SettingToggle
						label="Call buttons"
						description="Keep Chow, Pung, Kong and Win on screen, lit up whenever you can use them."
						checked={showCallButtons}
						onChange={setShowCallButtons}
					/>

					<div className="flex gap-3">
						<Button
							className="flex-1 bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
							onClick={() => startGame({ minFaan, hands })}
						>
							<Play className="mr-2 h-4 w-4" />
							Deal the tiles
						</Button>
						<Button
							variant="outline"
							className="border-white/15 bg-white/5 text-emerald-50 hover:bg-white/10"
							onClick={() => setShowRules(true)}
						>
							<BookOpen className="mr-2 h-4 w-4" />
							How to play
						</Button>
					</div>
				</CardContent>
			</Card>

			{showRules && <RulesPanel onClose={() => setShowRules(false)} />}
		</div>
	);
}
