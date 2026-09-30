import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const SECTIONS: { title: string; lines: string[] }[] = [
	{
		title: "The goal",
		lines: [
			"Build four sets and a pair from the 144-tile wall.",
			"A set is a pung (three identical), a kong (four identical) or a chow (three in a row in one suit).",
			"Flowers and seasons are set aside as bonus tiles and replaced from the back of the wall.",
		],
	},
	{
		title: "Your turn",
		lines: [
			"You draw a tile, then click any tile in your hand to discard it.",
			"Four of a kind in hand can be declared as a concealed kong; a drawn tile matching your exposed pung can be added to it.",
			"Play passes counter-clockwise: you, then Right, Across and Left.",
		],
	},
	{
		title: "Calling a discard",
		lines: [
			"Pung or kong any discard from any player.",
			"Chow only the tile discarded by the player to your left.",
			"A win beats a pung or kong, which beats a chow. Calling a set exposes it and you discard without drawing.",
		],
	},
	{
		title: "Scoring",
		lines: [
			"Hands are scored in faan and paid on the classic Hong Kong ladder, capped at the 13-faan limit.",
			"Self-draw: all three opponents pay. Won on a discard: the discarder pays.",
			"Common patterns: All Chows 1, All Pungs 3, Half Flush 3, Full Flush 7, Great Dragons 8, All Honours 10, Thirteen Orphans 13.",
			"The minimum faan you chose on the title screen must be met before a hand can be declared.",
		],
	},
];

export function RulesPanel({ onClose }: { onClose: () => void }) {
	return (
		<div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm">
			<div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-emerald-300/15 bg-emerald-950/95 p-6 text-emerald-50 shadow-2xl">
				<div className="mb-4 flex items-start justify-between gap-4">
					<h2 className="text-2xl font-semibold">House rules</h2>
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
					{SECTIONS.map((section) => (
						<section key={section.title}>
							<h3 className="mb-2 text-xs uppercase tracking-[0.2em] text-amber-300/80">
								{section.title}
							</h3>
							<ul className="space-y-1.5 text-sm text-emerald-100/85">
								{section.lines.map((line) => (
									<li key={line} className="flex gap-2">
										<span className="text-emerald-400/60">—</span>
										<span>{line}</span>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			</div>
		</div>
	);
}
