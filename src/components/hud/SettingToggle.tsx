/** A small labelled switch used by the title screen and the settings panel. */
export function SettingToggle({
	label,
	description,
	checked,
	onChange,
}: {
	label: string;
	description?: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={checked}
			onClick={() => onChange(!checked)}
			className="flex w-full items-center gap-3 rounded-lg border border-emerald-300/15 bg-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/10"
		>
			<span
				className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
					checked ? "bg-amber-400/80" : "bg-white/15"
				}`}
			>
				<span
					className={`absolute top-0.5 h-4 w-4 rounded-full bg-emerald-950 transition-all ${
						checked ? "left-[1.125rem]" : "left-0.5"
					}`}
				/>
			</span>
			<span className="min-w-0">
				<span className="block text-sm font-medium text-emerald-50">
					{label}
				</span>
				{description && (
					<span className="block text-[11px] leading-snug text-emerald-200/60">
						{description}
					</span>
				)}
			</span>
		</button>
	);
}
