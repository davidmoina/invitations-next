import type { PublicEventPageData } from "#/server/contracts/public";
import { EventTypeDetails } from "./event-type-details";
import { CalendarIcon, ExternalLinkIcon, MapPinIcon } from "./icons";

export type EventDetailsSectionProps = {
	event: PublicEventPageData["event"];
};

function formatTime(isoString: string, timezone: string): string {
	try {
		return new Intl.DateTimeFormat("es-ES", {
			hour: "2-digit",
			minute: "2-digit",
			timeZone: timezone || "UTC",
		}).format(new Date(isoString));
	} catch {
		return new Date(isoString).toLocaleTimeString("es-ES", {
			hour: "2-digit",
			minute: "2-digit",
		});
	}
}

function formatDate(isoString: string, timezone: string): string {
	try {
		return new Intl.DateTimeFormat("es-ES", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
			timeZone: timezone || "UTC",
		}).format(new Date(isoString));
	} catch {
		return new Date(isoString).toLocaleDateString("es-ES");
	}
}

export function EventDetailsSection({ event }: EventDetailsSectionProps) {
	const formattedDate = formatDate(event.startsAt, event.timezone);
	const formattedTime = formatTime(event.startsAt, event.timezone);

	return (
		<section id="details" className="py-12 px-4 max-w-2xl mx-auto space-y-8">
			{event.description && (
				<div className="p-6 sm:p-8 bg-surface-container-lowest rounded-2xl border border-stone-200 shadow-sm text-center">
					<p className="text-secondary text-base sm:text-lg leading-relaxed whitespace-pre-line font-serif italic text-on-surface">
						"{event.description}"
					</p>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Date & Time Card */}
				<div className="p-6 bg-surface-container-lowest rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
					<div className="flex items-start gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-champagne-50 text-primary flex items-center justify-center shrink-0 border border-champagne-100">
							<CalendarIcon className="w-5 h-5" />
						</div>
						<div>
							<h3 className="font-semibold text-base text-on-surface">
								Fecha y Hora
							</h3>
							<p className="text-sm text-secondary capitalize">
								{formattedDate}
							</p>
							<p className="text-sm font-medium text-primary mt-1">
								{formattedTime} h ({event.timezone})
							</p>
						</div>
					</div>
				</div>

				{/* Venue & Location Card */}
				<div className="p-6 bg-surface-container-lowest rounded-2xl border border-stone-200 shadow-sm flex flex-col justify-between">
					<div className="flex items-start gap-3 mb-4">
						<div className="w-10 h-10 rounded-full bg-champagne-50 text-primary flex items-center justify-center shrink-0 border border-champagne-100">
							<MapPinIcon className="w-5 h-5" />
						</div>
						<div>
							<h3 className="font-semibold text-base text-on-surface">Lugar</h3>
							<p className="text-sm text-secondary">
								{event.venueName || "Ubicación por confirmar"}
							</p>
						</div>
					</div>

					{event.venueMapUrl && (
						<a
							href={event.venueMapUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="w-full py-2.5 px-4 border border-stone-200 bg-white rounded-xl text-xs font-medium text-on-surface hover:bg-stone-50 transition-all flex items-center justify-center gap-1.5 shadow-sm mt-2"
						>
							<MapPinIcon className="w-4 h-4 text-primary" />
							<span>Cómo llegar</span>
							<ExternalLinkIcon className="w-3.5 h-3.5 text-stone-400" />
						</a>
					)}
				</div>
			</div>

			<EventTypeDetails details={event.details} />
		</section>
	);
}
