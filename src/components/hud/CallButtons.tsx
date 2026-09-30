import { useMemo, useState } from "react";
import type { ClaimType } from "@/game/types";
import { useGameStore } from "@/store/gameStore";

interface Choice {
	key: string;
	label: string;
	faan?: number;
	run: () => void;
}

const CALLS: { type: ClaimType; label: string; hint: string }[] = [
	{
		type: "chow",
		label: "Chow",
		hint: "Three in a row — only from the player on your left",
	},
	{ type: "pung", label: "Pung", hint: "Three of a kind from any discard" },
	{ type: "kong", label: "Kong", hint: "Four of a kind" },
	{ type: "win", label: "Win", hint: "Four sets and a pair" },
];

/**
 * The calls are always on screen and light up the moment one is available, so
 * the options are learnable rather than a surprise.
 */
export function CallButtons() {
	const awaiting = useGameStore((s) => s.awaiting);
	const turn = useGameStore((s) => s.turn);
	const claimOptions = useGameStore((s) => s.claimOptions);
	const turnActions = useGameStore((s) => s.turnActions);
	const humanClaim = useGameStore((s) => s.humanClaim);
	const humanPass = useGameStore((s) => s.humanPass);
	const humanTurnAction = useGameStore((s) => s.humanTurnAction);
	const [open, setOpen] = useState<ClaimType | null>(null);

	const choices = useMemo(() => {
		const map = new Map<ClaimType, Choice[]>();
		const add = (type: ClaimType, choice: Choice) => {
			const list = map.get(type);
			if (list) list.push(choice);
			else map.set(type, [choice]);
		};

		if (awaiting === "claim") {
			claimOptions.forEach((option, index) => {
				add(option.type, {
					key: `claim-${option.type}-${index}`,
					label: option.label,
					faan: option.faan,
					run: () => humanClaim(option),
				});
			});
		}
		// On your own turn a kong comes from your hand, and a win is a self draw.
		if (awaiting === "turn" && turn === 0) {
			for (const action of turnActions) {
				add(action.type === "win" ? "win" : "kong", {
					key: `turn-${action.type}-${action.kind}`,
					label: action.label,
					faan: action.faan,
					run: () => humanTurnAction(action),
				});
			}
		}
		return map;
	}, [
		awaiting,
		claimOptions,
		turnActions,
		turn,
		humanClaim,
		humanTurnAction,
	]);

	// Derived, so a menu never lingers over a call that has passed by.
	const openMenu = open !== null && choices.has(open) ? open : null;
	const canPass = awaiting === "claim";

	return (
		<div className="flex items-stretch gap-2 rounded-xl border border-emerald-300/15 bg-emerald-950/80 p-2 shadow-xl backdrop-blur-sm">
			{CALLS.map((call) => {
				const list = choices.get(call.type) ?? [];
				const active = list.length > 0;
				const isWin = call.type === "win";
				const faan = list.find((choice) => choice.faan !== undefined)?.faan;

				return (
					<div key={call.type} className="relative">
						<button
							type="button"
							disabled={!active}
							title={active ? list.map((c) => c.label).join(" · ") : call.hint}
							onClick={() => {
								if (list.length === 1) list[0].run();
								else setOpen((current) => (current === call.type ? null : call.type));
							}}
							className={`h-11 w-[5.5rem] rounded-lg border text-sm font-semibold transition-all ${
								active
									? isWin
										? "border-amber-200/70 bg-amber-400 text-amber-950 shadow-[0_0_20px_rgba(251,191,36,0.5)] hover:bg-amber-300"
										: "border-emerald-200/60 bg-emerald-500 text-emerald-950 shadow-[0_0_18px_rgba(16,185,129,0.45)] hover:bg-emerald-400"
									: "cursor-not-allowed border-white/5 bg-white/[0.03] text-emerald-100/25"
							}`}
						>
							{call.label}
							{active && faan !== undefined && (
								<span className="ml-1 text-[11px] font-medium opacity-80">
									{faan}f
								</span>
							)}
							{active && list.length > 1 && (
								<span className="ml-1 text-[11px] opacity-70">▾</span>
							)}
						</button>

						{openMenu === call.type && list.length > 1 && (
							<div className="absolute bottom-[3.25rem] left-1/2 z-10 -translate-x-1/2 space-y-1 rounded-lg border border-emerald-300/20 bg-emerald-950/95 p-1.5 shadow-2xl">
								{list.map((choice) => (
									<button
										key={choice.key}
										type="button"
										onClick={() => {
											setOpen(null);
											choice.run();
										}}
										className="block w-full whitespace-nowrap rounded-md px-3 py-1.5 text-left text-xs font-medium text-emerald-50 transition-colors hover:bg-white/10"
									>
										{choice.label}
									</button>
								))}
							</div>
						)}
					</div>
				);
			})}

			<button
				type="button"
				disabled={!canPass}
				onClick={humanPass}
				className={`h-11 w-[4.5rem] rounded-lg border text-sm font-medium transition-all ${
					canPass
						? "border-white/20 bg-white/10 text-emerald-50 hover:bg-white/20"
						: "cursor-not-allowed border-white/5 bg-white/[0.03] text-emerald-100/25"
				}`}
			>
				Pass
			</button>
		</div>
	);
}
