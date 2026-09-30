import { BookOpen, Home, Lightbulb, ScrollText, Settings } from "lucide-react";
import { useMemo, useState } from "react";
import { shanten, waits } from "@/game/melds";
import { countKinds, shortLabel } from "@/game/tiles";
import { Button } from "@/components/ui/button";
import { WIND_NAMES, useGameStore } from "@/store/gameStore";
import { CallButtons } from "./CallButtons";
import { RulesPanel } from "./RulesPanel";
import { SettingsPanel } from "./Settings";

function Panel({
	children,
	className = "",
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={`rounded-xl border border-emerald-300/15 bg-emerald-950/75 text-emerald-50 shadow-xl backdrop-blur-sm ${className}`}
		>
			{children}
		</div>
	);
}

function HandInfo() {
	const handNumber = useGameStore((s) => s.handNumber);
	const maxHands = useGameStore((s) => s.maxHands);
	const roundWind = useGameStore((s) => s.roundWind);
	const dealer = useGameStore((s) => s.dealer);
	const minFaan = useGameStore((s) => s.minFaan);

	return (
		<Panel className="px-4 py-3">
			<div className="text-xs uppercase tracking-[0.2em] text-emerald-300/70">
				Hand {handNumber} of {maxHands}
			</div>
			<div className="mt-1 text-lg font-semibold">
				{WIND_NAMES[roundWind]} round
			</div>
			<div className="mt-1 space-y-0.5 text-xs text-emerald-200/70">
				<div>You are {WIND_NAMES[(0 - dealer + 4) % 4]}</div>
				<div>Minimum {minFaan} faan to win</div>
			</div>
		</Panel>
	);
}

function Scores() {
	const players = useGameStore((s) => s.players);
	const turn = useGameStore((s) => s.turn);
	const dealer = useGameStore((s) => s.dealer);

	return (
		<Panel className="px-3 py-2">
			{players.map((player) => (
				<div
					key={player.seat}
					className={`flex items-center justify-between rounded-md px-2 py-1 text-sm ${
						turn === player.seat ? "bg-amber-400/15 text-amber-100" : ""
					}`}
				>
					<span className="flex items-center gap-1.5">
						{player.name}
						{dealer === player.seat && (
							<span className="rounded bg-rose-400/20 px-1 text-[10px] uppercase text-rose-200">
								dealer
							</span>
						)}
					</span>
					<span className="tabular-nums font-mono text-emerald-200">
						{player.points >= 0 ? "+" : ""}
						{player.points}
					</span>
				</div>
			))}
		</Panel>
	);
}

function Advice() {
	const players = useGameStore((s) => s.players);
	const drawnTileId = useGameStore((s) => s.drawnTileId);
	const player = players[0];

	const info = useMemo(() => {
		const counts = countKinds(player.hand);
		if (drawnTileId) {
			const drawn = player.hand.find((t) => t.id === drawnTileId);
			if (drawn) counts[drawn.kind] -= 1;
		}
		const meldCount = player.melds.length;
		const distance = shanten(counts, meldCount);
		return {
			distance,
			waiting: distance <= 0 ? waits(counts, meldCount) : [],
		};
	}, [player.hand, player.melds.length, drawnTileId]);

	return (
		<Panel className="px-4 py-3 text-sm">
			<div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-300/70">
				<Lightbulb className="h-3.5 w-3.5" />
				Hand reading
			</div>
			{info.distance <= 0 ? (
				<div className="mt-2">
					<span className="rounded bg-amber-400/20 px-2 py-0.5 font-semibold text-amber-100">
						Ready
					</span>
					<div className="mt-1.5 flex flex-wrap gap-1">
						{info.waiting.map((kind) => (
							<span
								key={kind}
								className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-xs"
							>
								{shortLabel(kind)}
							</span>
						))}
					</div>
				</div>
			) : (
				<div className="mt-2 text-emerald-100/80">
					{info.distance} tile{info.distance === 1 ? "" : "s"} from ready
				</div>
			)}
		</Panel>
	);
}

/**
 * The prompt lives at the top of the screen: the bottom of the table belongs to
 * the player's hand and the call buttons.
 */
function StatusBanner() {
	const awaiting = useGameStore((s) => s.awaiting);
	const turn = useGameStore((s) => s.turn);
	const claimOptions = useGameStore((s) => s.claimOptions);
	const thinking = useGameStore((s) => s.thinking);
	const players = useGameStore((s) => s.players);

	if (awaiting === "claim") {
		return (
			<Panel className="px-4 py-2.5 text-sm text-amber-100">
				{claimOptions.length === 1
					? "You can call this discard"
					: "You can call this discard — pick one"}
			</Panel>
		);
	}

	if (awaiting === "turn" && turn === 0) {
		return (
			<Panel className="px-4 py-2.5 text-sm text-emerald-200/85">
				Click a tile to discard it
			</Panel>
		);
	}

	return (
		<Panel className="px-4 py-2.5 text-sm text-emerald-200/70">
			{thinking !== null
				? `${players[thinking].name} is thinking…`
				: "Waiting for the other players…"}
		</Panel>
	);
}

/** Used when the persistent call bar is switched off: buttons only as needed. */
function TransientActions() {
	const awaiting = useGameStore((s) => s.awaiting);
	const turn = useGameStore((s) => s.turn);
	const claimOptions = useGameStore((s) => s.claimOptions);
	const turnActions = useGameStore((s) => s.turnActions);
	const humanClaim = useGameStore((s) => s.humanClaim);
	const humanPass = useGameStore((s) => s.humanPass);
	const humanTurnAction = useGameStore((s) => s.humanTurnAction);

	if (awaiting === "claim") {
		return (
			<Panel className="flex flex-wrap items-center justify-center gap-2 px-4 py-3">
				{claimOptions.map((option) => (
					<Button
						key={`${option.type}-${option.label}`}
						className={
							option.type === "win"
								? "bg-amber-400 text-amber-950 hover:bg-amber-300"
								: "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
						}
						onClick={() => humanClaim(option)}
					>
						{option.label}
					</Button>
				))}
				<Button
					variant="outline"
					className="border-white/15 bg-white/5 text-emerald-50 hover:bg-white/10"
					onClick={humanPass}
				>
					Pass
				</Button>
			</Panel>
		);
	}

	if (awaiting === "turn" && turn === 0 && turnActions.length > 0) {
		return (
			<Panel className="flex flex-wrap items-center justify-center gap-2 px-4 py-3">
				{turnActions.map((action) => (
					<Button
						key={`${action.type}-${action.kind}`}
						className={
							action.type === "win"
								? "bg-amber-400 text-amber-950 hover:bg-amber-300"
								: "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
						}
						onClick={() => humanTurnAction(action)}
					>
						{action.label}
					</Button>
				))}
			</Panel>
		);
	}

	return null;
}

function Log() {
	const entries = useGameStore((s) => s.log);
	const [open, setOpen] = useState(true);

	return (
		<Panel className="w-64 px-3 py-2 text-xs">
			<button
				type="button"
				className="flex w-full items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-emerald-300/70"
				onClick={() => setOpen((value) => !value)}
			>
				<ScrollText className="h-3.5 w-3.5" />
				Table talk
			</button>
			{open && (
				<ul className="mt-2 space-y-1">
					{entries.slice(0, 6).map((entry) => (
						<li
							key={entry.id}
							className={
								entry.highlight ? "text-amber-200" : "text-emerald-100/75"
							}
						>
							{entry.text}
						</li>
					))}
				</ul>
			)}
		</Panel>
	);
}

export function Hud() {
	const goHome = useGameStore((s) => s.goHome);
	const showCallButtons = useGameStore((s) => s.showCallButtons);
	const [showRules, setShowRules] = useState(false);
	const [showSettings, setShowSettings] = useState(false);

	return (
		<>
			<div className="pointer-events-none absolute inset-0 z-10 p-4">
				<div className="pointer-events-auto absolute left-4 top-4 space-y-3">
					<HandInfo />
					<Advice />
				</div>

				<div className="pointer-events-auto absolute right-4 top-4 w-56 space-y-3">
					<Scores />
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							size="icon"
							className="border-white/15 bg-emerald-950/75 text-emerald-50 hover:bg-white/10"
							onClick={() => setShowRules(true)}
						>
							<BookOpen className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="border-white/15 bg-emerald-950/75 text-emerald-50 hover:bg-white/10"
							onClick={() => setShowSettings(true)}
						>
							<Settings className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							className="border-white/15 bg-emerald-950/75 text-emerald-50 hover:bg-white/10"
							onClick={goHome}
						>
							<Home className="h-4 w-4" />
						</Button>
					</div>
				</div>

				<div className="pointer-events-auto absolute bottom-4 left-4">
					<Log />
				</div>

				<div className="pointer-events-auto absolute left-1/2 top-4 -translate-x-1/2">
					<StatusBanner />
				</div>

				<div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2">
					{showCallButtons ? <CallButtons /> : <TransientActions />}
				</div>
			</div>

			{showRules && <RulesPanel onClose={() => setShowRules(false)} />}
			{showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
		</>
	);
}
