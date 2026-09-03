"use client";
import { useMemo, useState } from "react";
import type { AdminEventListItem } from "#/server/contracts/admin";
import { ArrowRightIcon, CalendarIcon, PlusIcon } from "../icons";
import { AdminShell } from "./admin-shell";

export type EventListProps = {
	events: AdminEventListItem[];
	/** The route builds `/admin/${eventId}`; the component stays router-agnostic. */
	eventHref: (eventId: string) => string;
	newEventHref: string; // the route passes "/admin/new"
	homeHref: string;
	onSignOut: () => Promise<void>;
	/** Reference instant for the upcoming/past split, as an ISO-8601 string.
	 *  Defaults to the clock at mount. Tests inject a frozen value so that
	 *  date-sensitive assertions cannot start failing as the wall clock passes
	 *  a fixture date. */
	now?: string;
};

type FilterTab = "all" | "upcoming" | "past";

const STATUS_LABELS: Record<AdminEventListItem["status"], string> = {
	draft: "Borrador",
	published: "Publicado",
	archived: "Archivado",
};

const ROLE_LABELS: Record<AdminEventListItem["role"], string> = {
	owner: "Propietario",
	editor: "Editor",
};

const STATUS_CLASSES: Record<AdminEventListItem["status"], string> = {
	draft: "bg-warning-bg text-warning-amber border border-warning-amber/30",
	published: "bg-success-bg text-success-green border border-success-green/30",
	archived: "bg-stone-200 text-secondary border border-stone-300",
};

function formatEventDate(isoString: string): string {
	try {
		return new Intl.DateTimeFormat("es-ES", {
			day: "numeric",
			month: "short",
			year: "numeric",
			timeZone: "UTC",
		}).format(new Date(isoString));
	} catch {
		return isoString;
	}
}

export function EventList({
	events,
	eventHref,
	newEventHref,
	homeHref,
	onSignOut,
	now: nowOverride,
}: EventListProps) {
	const [activeTab, setActiveTab] = useState<FilterTab>("all");

	// Resolved once per mount. Reading the clock during render would hand every
	// memo below a fresh dependency each pass, defeating them entirely.
	const [clockNow] = useState(() => new Date().toISOString());
	const now = nowOverride ?? clockNow;

	const filteredEvents = useMemo(() => {
		if (activeTab === "upcoming") {
			return events.filter((e) => e.status !== "archived" && e.startsAt >= now);
		}
		if (activeTab === "past") {
			return events.filter((e) => e.status === "archived" || e.startsAt < now);
		}
		return events;
	}, [events, activeTab, now]);

	const upcomingCount = useMemo(
		() =>
			events.filter((e) => e.status !== "archived" && e.startsAt >= now).length,
		[events, now],
	);

	const pastCount = useMemo(
		() =>
			events.filter((e) => e.status === "archived" || e.startsAt < now).length,
		[events, now],
	);

	return (
		<AdminShell
			currentSection="events"
			eventsHref={homeHref}
			newEventHref={newEventHref}
			dashboardHref="/admin/dashboard"
			onSignOut={onSignOut}
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10 flex flex-col gap-6 sm:gap-8">
				{/* Page Header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h1 className="font-serif italic text-3xl sm:text-4xl font-semibold text-primary">
							Mis Eventos
						</h1>
						<p className="text-secondary text-sm sm:text-base mt-1">
							Gestiona tus celebraciones y eventos organizados.
						</p>
					</div>

					<a
						href={newEventHref}
						className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-primary text-white font-medium text-sm shadow-xs hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary self-start sm:self-auto"
					>
						<PlusIcon className="w-4 h-4" />
						<span>Crear evento</span>
					</a>
				</div>

				{/* Filter Tabs */}
				<div className="flex border-b border-stone-200 gap-2 sm:gap-4 overflow-x-auto">
					<button
						type="button"
						onClick={() => setActiveTab("all")}
						className={`pb-3 px-3 sm:px-4 text-sm font-medium transition-colors relative whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary ${
							activeTab === "all"
								? "text-primary font-semibold border-b-2 border-primary"
								: "text-secondary hover:text-primary"
						}`}
					>
						Todos ({events.length})
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("upcoming")}
						className={`pb-3 px-3 sm:px-4 text-sm font-medium transition-colors relative whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary ${
							activeTab === "upcoming"
								? "text-primary font-semibold border-b-2 border-primary"
								: "text-secondary hover:text-primary"
						}`}
					>
						Próximos ({upcomingCount})
					</button>

					<button
						type="button"
						onClick={() => setActiveTab("past")}
						className={`pb-3 px-3 sm:px-4 text-sm font-medium transition-colors relative whitespace-nowrap focus-visible:ring-2 focus-visible:ring-primary ${
							activeTab === "past"
								? "text-primary font-semibold border-b-2 border-primary"
								: "text-secondary hover:text-primary"
						}`}
					>
						Pasados ({pastCount})
					</button>
				</div>

				{/* Event Grid or Empty State */}
				{filteredEvents.length === 0 ? (
					<div className="bg-surface rounded-2xl border border-stone-200/80 p-12 text-center shadow-2xs">
						<div className="w-12 h-12 mx-auto rounded-full bg-champagne-100 text-champagne-700 flex items-center justify-center mb-4">
							<CalendarIcon className="w-6 h-6" />
						</div>
						<p className="text-base text-secondary font-medium mb-4">
							{events.length === 0
								? "Todavía no tienes ningún evento creado."
								: "No hay eventos en esta categoría."}
						</p>
						<a
							href={newEventHref}
							className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-medium text-sm hover:opacity-90 transition-opacity shadow-xs"
						>
							<PlusIcon className="w-4 h-4" />
							<span>Crear evento</span>
						</a>
					</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{filteredEvents.map((event) => {
							const actionLabel =
								event.status === "draft"
									? "Continuar edición"
									: event.status === "archived"
										? "Ver detalles"
										: "Gestionar evento";

							return (
								<div
									key={event.id}
									className="bg-surface rounded-2xl border border-stone-200/80 shadow-2xs hover:shadow-card hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden group"
								>
									{/* Card Top / Header Slot */}
									<div className="h-36 bg-linear-to-br from-champagne-50 via-surface-container to-stone-100 p-4 flex justify-between items-start border-b border-stone-200/50 relative">
										<div className="flex items-center gap-2">
											<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface text-secondary border border-stone-200/80 shadow-2xs">
												{ROLE_LABELS[event.role]}
											</span>
										</div>
										<span
											className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-2xs ${STATUS_CLASSES[event.status]}`}
										>
											{STATUS_LABELS[event.status]}
										</span>
									</div>

									{/* Card Body */}
									<div className="p-6 flex-1 flex flex-col">
										<h2>
											<a
												href={eventHref(event.id)}
												className="font-serif italic text-xl font-bold text-primary hover:underline line-clamp-1"
											>
												{event.title}
											</a>
										</h2>

										<div className="flex items-center gap-2 text-xs text-secondary mt-2">
											<CalendarIcon className="w-4 h-4 text-champagne-700 shrink-0" />
											<span>{formatEventDate(event.startsAt)}</span>
										</div>

										<div className="grid grid-cols-2 gap-3 mt-6 p-3 rounded-xl bg-stone-50 border border-stone-200/60 text-xs">
											<div>
												<p className="text-secondary/80 uppercase tracking-wider font-medium text-[10px]">
													Confirmados
												</p>
												<p className="font-semibold text-sm text-on-surface mt-0.5">
													{event.attendingCount} / {event.guestCount}
												</p>
											</div>
											<div>
												<p className="text-secondary/80 uppercase tracking-wider font-medium text-[10px]">
													Total Invitados
												</p>
												<p className="font-semibold text-sm text-on-surface mt-0.5">
													{event.guestCount}
												</p>
											</div>
										</div>

										{/* Card Footer */}
										<div className="mt-6 pt-4 border-t border-stone-200/60 flex items-center justify-between">
											<span className="text-xs text-secondary font-medium">
												{event.status === "published"
													? "Activo"
													: event.status === "draft"
														? "En preparación"
														: "Finalizado"}
											</span>
											<a
												href={eventHref(event.id)}
												className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
											>
												<span>{actionLabel}</span>
												<ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
											</a>
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</AdminShell>
	);
}
