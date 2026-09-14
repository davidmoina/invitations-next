import type { PublicEventPageData } from "#/server/contracts/public";
import { EventTypeDetails } from "./event-type-details";
import { CalendarIcon, ExternalLinkIcon, MapIcon, MapPinIcon } from "./icons";

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
		const raw = new Intl.DateTimeFormat("es-ES", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
			timeZone: timezone || "UTC",
		}).format(new Date(isoString));
		return raw.charAt(0).toUpperCase() + raw.slice(1);
	} catch {
		return new Date(isoString).toLocaleDateString("es-ES");
	}
}

function buildGoogleCalendarUrl(event: {
	title: string;
	startsAt: string;
	description?: string | null;
	venueName?: string | null;
	venueAddress?: string | null;
}): string {
	try {
		const startDate = new Date(event.startsAt);
		const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

		const formatGCalDate = (d: Date) =>
			d
				.toISOString()
				.replace(/[-:]/g, "")
				.replace(/\.\d{3}/, "");

		const location = [event.venueName, event.venueAddress]
			.filter(Boolean)
			.join(", ");

		const params = new URLSearchParams({
			action: "TEMPLATE",
			text: event.title,
			dates: `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`,
			details: event.description || "",
			location,
		});

		return `https://calendar.google.com/calendar/render?${params.toString()}`;
	} catch {
		return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}`;
	}
}

export function EventDetailsSection({ event }: EventDetailsSectionProps) {
	const formattedDate = formatDate(event.startsAt, event.timezone);
	const formattedTime = formatTime(event.startsAt, event.timezone);

	const locationQuery = [event.venueName, event.venueAddress]
		.filter(Boolean)
		.join(", ");

	const mapDirectionsUrl =
		event.venueMapUrl ||
		(locationQuery
			? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`
			: null);

	const mapEmbedUrl = locationQuery
		? `https://maps.google.com/maps?q=${encodeURIComponent(locationQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`
		: null;

	const calendarUrl = buildGoogleCalendarUrl(event);

	return (
		<section id="details" className="py-12 px-4 max-w-2xl mx-auto space-y-6">
			{/* Event description quote */}
			{event.description && (
				<div className="p-6 sm:p-8 bg-surface-container-lowest rounded-2xl border border-stone-200/80 shadow-sm text-center">
					<p className="text-secondary text-base sm:text-lg leading-relaxed whitespace-pre-line font-serif italic text-on-surface">
						"{event.description}"
					</p>
				</div>
			)}

			{/* Side-by-side balanced cards: Cuándo y Dónde */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
				{/* Cuándo Card */}
				<div className="p-6 bg-surface-container-lowest rounded-2xl border border-stone-200/80 shadow-sm flex flex-col justify-between">
					<div>
						<div className="flex items-center gap-3 mb-4">
							<div className="w-10 h-10 rounded-full bg-champagne-50 text-primary flex items-center justify-center shrink-0 border border-champagne-100">
								<CalendarIcon className="w-5 h-5" />
							</div>
							<div>
								<span className="text-[11px] uppercase tracking-wider font-semibold text-champagne-800 block">
									Cuándo
								</span>
								<h3 className="font-semibold text-base text-on-surface">
									Fecha y Hora
								</h3>
							</div>
						</div>

						<div className="space-y-1">
							<p className="font-serif italic text-2xl font-bold text-primary tracking-tight">
								{formattedDate}
							</p>
							<p className="text-sm font-medium text-secondary">
								{formattedTime} h ({event.timezone})
							</p>
						</div>

						{/* Integrated EventType detail (e.g. Due date for baby shower) */}
						<EventTypeDetails details={event.details} variant="inline" />
					</div>

					<a
						href={calendarUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="w-full py-2.5 px-4 border border-stone-200 bg-white rounded-xl text-xs sm:text-sm font-medium text-on-surface hover:bg-stone-50 transition-all flex items-center justify-center gap-2 shadow-2xs mt-5 focus-visible:ring-2 focus-visible:ring-primary"
					>
						<CalendarIcon className="w-4 h-4 text-primary" />
						<span>Añadir al calendario</span>
						<ExternalLinkIcon className="w-3.5 h-3.5 text-stone-400" />
					</a>
				</div>

				{/* Dónde Card with Map inside the same block */}
				<div className="bg-surface-container-lowest rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden flex flex-col justify-between">
					{/* Map at the top of the block */}
					{mapEmbedUrl ? (
						<div className="relative w-full h-44 sm:h-48 bg-stone-100 border-b border-stone-200/60 shrink-0">
							<iframe
								src={mapEmbedUrl}
								title={`Mapa de ubicación de ${event.venueName || "el evento"}`}
								className="w-full h-full border-0"
								loading="lazy"
								referrerPolicy="no-referrer-when-downgrade"
							/>
						</div>
					) : (
						<div className="p-5 sm:p-6 pb-0 flex items-center gap-3">
							<div className="w-10 h-10 rounded-full bg-champagne-50 text-primary flex items-center justify-center shrink-0 border border-champagne-100">
								<MapPinIcon className="w-5 h-5" />
							</div>
							<div>
								<span className="text-[11px] uppercase tracking-wider font-semibold text-champagne-800 block">
									Dónde
								</span>
								<h3 className="font-semibold text-base text-on-surface">
									Lugar
								</h3>
							</div>
						</div>
					)}

					{/* Location details below the map */}
					<div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
						<div>
							{mapEmbedUrl && (
								<div className="flex items-center gap-1.5 mb-1 text-champagne-800">
									<MapPinIcon className="w-3.5 h-3.5 shrink-0" />
									<span className="text-[11px] uppercase tracking-wider font-semibold">
										Lugar
									</span>
								</div>
							)}
							<h3 className="font-serif italic text-2xl font-bold text-primary tracking-tight">
								{event.venueName || "Ubicación por confirmar"}
							</h3>
							{event.venueAddress ? (
								<p className="text-sm text-secondary mt-1 whitespace-pre-line leading-relaxed">
									{event.venueAddress}
								</p>
							) : (
								<p className="text-sm text-secondary mt-1">
									{event.venueName ? "Ubicación del evento" : "Por confirmar"}
								</p>
							)}
						</div>

						{mapDirectionsUrl && (
							<a
								href={mapDirectionsUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="w-full py-2.5 px-4 border border-stone-200 bg-white rounded-xl text-xs sm:text-sm font-medium text-on-surface hover:bg-stone-50 transition-all flex items-center justify-center gap-2 shadow-2xs mt-4 focus-visible:ring-2 focus-visible:ring-primary"
							>
								<MapIcon className="w-4 h-4 text-primary" />
								<span>Cómo llegar</span>
								<ExternalLinkIcon className="w-3.5 h-3.5 text-stone-400" />
							</a>
						)}
					</div>
				</div>
			</div>
		</section>
	);
}
