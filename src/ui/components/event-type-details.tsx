import type { PublicEventDetails } from "#/server/contracts/public";
import { CalendarIcon } from "./icons";

export type EventTypeDetailsProps = {
	details: PublicEventDetails;
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

export function EventTypeDetails({ details }: EventTypeDetailsProps) {
	switch (details.type) {
		case "baby_shower":
			return (
				<div className="p-6 bg-surface-container-lowest rounded-2xl border border-stone-200 shadow-sm">
					<div className="flex items-start gap-3">
						<div className="w-10 h-10 rounded-full bg-champagne-50 text-primary flex items-center justify-center shrink-0 border border-champagne-100">
							<CalendarIcon className="w-5 h-5" />
						</div>
						<div>
							<h3 className="font-semibold text-base text-on-surface">
								Fecha prevista
							</h3>
							<p className="text-sm text-secondary mt-1">
								{formatDueDate(details.dueDate)}
							</p>
						</div>
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
