import { Gauge } from "lucide-react";
import { SPEED_PRESETS, useGameStore } from "@/store/gameStore";

/** Segmented control for how long the computer players take over each move. */
export function SpeedControl({
	label = true,
	className = "",
}: {
	label?: boolean;
	className?: string;
}) {
	const speed = useGameStore((s) => s.speed);
	const setSpeed = useGameStore((s) => s.setSpeed);

	return (
		<div className={className}>
			{label && (
				<div className="mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-emerald-300/70">
					<Gauge className="h-3.5 w-3.5" />
					Table speed
				</div>
			)}
			<div
				className="flex gap-1 rounded-lg border border-emerald-300/15 bg-emerald-950/75 p-1 backdrop-blur-sm"
				role="radiogroup"
				aria-label="Table speed"
			>
				{SPEED_PRESETS.map((preset) => (
					<button
						key={preset.value}
						type="button"
						role="radio"
						aria-checked={speed === preset.value}
						onClick={() => setSpeed(preset.value)}
						className={`min-w-0 flex-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors ${
							speed === preset.value
								? "bg-amber-400/20 text-amber-100"
								: "text-emerald-100/70 hover:bg-white/10"
						}`}
					>
						{preset.label}
					</button>
				))}
			</div>
		</div>
	);
}
