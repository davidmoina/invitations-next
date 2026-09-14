import type { PublicEventDetails } from "#/server/contracts/public";
import { CalendarIcon, HeartIcon } from "./icons";

export type EventTypeDetailsProps = {
	details: PublicEventDetails;
	variant?: "card" | "inline";
};

function formatDueDate(dateString: string): string {
	try {
		const [year, month, day] = dateString.split("-").map(Number);
		if (year && month && day) {
			const date = new Date(Date.UTC(year, month - 1, day));
			return new Intl.DateTimeFormat("es-ES", {
				day: "numeric",
				month: "long",
				year: "numeric",
				timeZone: "UTC",
			}).format(date);
		}
		return new Intl.DateTimeFormat("es-ES", {
			day: "numeric",
			month: "long",
			year: "numeric",
		}).format(new Date(dateString));
	} catch {
		return dateString;
	}
}

export function EventTypeDetails({
	details,
	variant = "card",
}: EventTypeDetailsProps) {
	switch (details.type) {
		case "baby_shower":
			if (variant === "inline") {
				return (
					<div className="mt-4 p-3 rounded-xl bg-champagne-50/80 border border-champagne-200/60 flex items-center gap-3">
						<div className="w-8 h-8 rounded-full bg-white text-primary flex items-center justify-center shrink-0 border border-champagne-100 shadow-2xs">
							<HeartIcon className="w-4 h-4" />
						</div>
						<div>
							<span className="text-[11px] uppercase tracking-wider font-semibold text-champagne-800 block">
								Fecha prevista
							</span>
							<p className="text-xs sm:text-sm font-medium text-on-surface">
								{formatDueDate(details.dueDate)}
							</p>
						</div>
					</div>
				);
			}
			return (
				<div className="rounded-2xl bg-[#f8fafc] border border-slate-200 p-4 flex items-center gap-3.5 mb-5">
					<div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#274b70] shadow-2xs border border-slate-200 shrink-0">
						<CalendarIcon className="w-4 h-4" />
					</div>
					<div>
						<span className="text-[10px] uppercase tracking-wider font-semibold text-slate-500 block">
							Fecha Prevista de Nacimiento
						</span>
						<span className="text-sm font-medium text-slate-800">
							{formatDueDate(details.dueDate)}
						</span>
					</div>
				</div>
			);
		case "wedding":
			return null;
		case "birthday":
			return null;
		case "other":
			return null;
	}
}
