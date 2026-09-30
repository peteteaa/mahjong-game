import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/store/gameStore";
import { SettingToggle } from "./SettingToggle";
import { SpeedControl } from "./SpeedControl";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
	const showCallButtons = useGameStore((s) => s.showCallButtons);
	const setShowCallButtons = useGameStore((s) => s.setShowCallButtons);

	return (
		<div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
			<div className="w-full max-w-md rounded-xl border border-emerald-300/15 bg-emerald-950/95 p-6 text-emerald-50 shadow-2xl">
				<div className="mb-5 flex items-start justify-between gap-4">
					<h2 className="text-2xl font-semibold">Settings</h2>
					<Button
						variant="ghost"
						size="icon"
						className="text-emerald-200 hover:bg-white/10"
						onClick={onClose}
					>
						<X className="h-4 w-4" />
					</Button>
				</div>

				<div className="space-y-5">
					<SpeedControl />
					<SettingToggle
						label="Call buttons"
						description="Keep Chow, Pung, Kong and Win on screen, lit up whenever you can use them."
						checked={showCallButtons}
						onChange={setShowCallButtons}
					/>
				</div>

				<p className="mt-5 text-[11px] leading-relaxed text-emerald-200/50">
					Both settings are remembered on this device. With the call buttons
					hidden, the options still appear as buttons the moment a call is
					available.
				</p>
			</div>
		</div>
	);
}
