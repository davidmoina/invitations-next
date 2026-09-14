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

function getCalendarUrl(event: PublicEventPageData["event"]): string {
  const startDate = new Date(event.startsAt);
  const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000); // 3h duration default
  const formatCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatCalDate(startDate)}/${formatCalDate(endDate)}`,
    details: event.description || "",
    location: event.venueName || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
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
    <div id="details" className="space-y-10">
      {/* Invitation Quote */}
      {event.description && (
        <section
          data-purpose="invitation-quote"
          className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-slate-200 relative text-center"
        >
          <div className="relative quote-decoration pt-3">
            <p className="font-serif italic text-lg sm:text-2xl text-slate-700 leading-relaxed max-w-2xl mx-auto whitespace-pre-line">
              "{event.description}"
            </p>
            <div className="mt-6 flex justify-center items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#335377]/30" />
              <span className="w-2 h-2 rounded-full bg-[#2c4d6f]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#335377]/30" />
            </div>
          </div>
        </section>
      )}

      {/* When & Where Grid */}
      <section
        data-purpose="event-details-grid"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Card: Cuándo */}
        <article className="bg-white rounded-3xl p-7 sm:p-8 shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition duration-300">
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-[#e8f1fa] flex items-center justify-center text-[#274b70] border border-[#d1e4ff]">
                <CalendarIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#274b70] block">
                  Cuándo
                </span>
                <h2 className="font-serif text-xl font-bold text-slate-800">
                  Fecha y Hora
                </h2>
              </div>
            </div>

            <div className="space-y-1 mb-5">
              <p className="font-serif text-2xl sm:text-3xl font-bold text-slate-800 leading-tight capitalize">
                {formattedDate}
              </p>
              <p className="text-sm font-medium text-slate-500">
                {formattedTime} h{" "}
                <span className="text-xs text-slate-400 font-normal">
                  ({event.timezone})
                </span>
              </p>
            </div>

            {event.details && <EventTypeDetails details={event.details} />}
          </div>

          <a
            className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-[#f1f6fb] text-[#274b70] font-medium text-sm transition-all duration-200 shadow-sm active:scale-[0.99] mt-4"
            href={getCalendarUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <CalendarIcon className="w-4 h-4 text-[#2c4d6f]" />
            <span>Añadir al calendario</span>
            <ExternalLinkIcon className="w-3.5 h-3.5 opacity-60 ml-0.5" />
          </a>
        </article>

        {/* Card: Lugar */}
        <article className="bg-white rounded-3xl p-7 sm:p-8 shadow-sm border border-slate-200 flex flex-col justify-between hover:shadow-md transition duration-300">
          <div>
            <div className="relative w-full h-36 rounded-2xl overflow-hidden border border-slate-200 mb-5 bg-slate-100 group">
              <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 flex items-center justify-center">
                <MapPinIcon className="w-8 h-8 text-[#2c4d6f]/40 group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent pointer-events-none" />
              {event.venueMapUrl && (
                <a
                  className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/95 text-slate-700 text-xs font-medium shadow-sm hover:bg-white transition"
                  href={event.venueMapUrl}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <span>Maps</span>
                  <ExternalLinkIcon className="w-3 h-3 text-slate-500" />
                </a>
              )}
            </div>

            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-[#e8f1fa] flex items-center justify-center text-[#274b70] shrink-0 mt-0.5 border border-[#d1e4ff]">
                <MapPinIcon className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] uppercase tracking-[0.2em] font-semibold text-[#274b70] block">
                  Lugar
                </span>
                <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-800">
                  {event.venueName || "Ubicación por confirmar"}
                </h2>
              </div>
            </div>
          </div>

          {event.venueMapUrl && (
            <a
              className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl border border-slate-200 bg-white hover:bg-[#f1f6fb] text-[#274b70] font-medium text-sm transition-all duration-200 shadow-sm active:scale-[0.99] mt-4"
              href={event.venueMapUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <MapPinIcon className="w-4 h-4 text-[#2c4d6f]" />
              <span>Cómo llegar</span>
              <ExternalLinkIcon className="w-3.5 h-3.5 opacity-60 ml-0.5" />
            </a>
          )}
        </article>
      </section>
    </div>
  );
}
