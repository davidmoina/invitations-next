"use client";
import { useMemo } from "react";
import type { AdminEventListItem } from "#/server/contracts/admin";
import {
	ArrowRightIcon,
	CalendarIcon,
	CheckCircleIcon,
	DashboardIcon,
	PlusIcon,
	UsersIcon,
} from "../icons";
import { AdminShell } from "./admin-shell";

export type MultiEventDashboardProps = {
	events: AdminEventListItem[];
	eventHref: (eventId: string) => string;
	newEventHref: string;
	eventsHref: string;
	onSignOut: () => Promise<void>;
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

export function MultiEventDashboard({
	events,
	eventHref,
	newEventHref,
	eventsHref,
	onSignOut,
}: MultiEventDashboardProps) {
	const now = new Date().toISOString();

	const metrics = useMemo(() => {
		const totalGuests = events.reduce((acc, e) => acc + e.guestCount, 0);
		const totalAttending = events.reduce((acc, e) => acc + e.attendingCount, 0);
		const publishedEvents = events.filter((e) => e.status === "published");
		const draftEvents = events.filter((e) => e.status === "draft");
		const archivedEvents = events.filter((e) => e.status === "archived");
		const upcomingEvents = events.filter(
			(e) => e.status !== "archived" && e.startsAt >= now,
		);

		const attendanceRate =
			totalGuests > 0 ? Math.round((totalAttending / totalGuests) * 100) : 0;

		return {
			totalGuests,
			totalAttending,
			publishedCount: publishedEvents.length,
			draftCount: draftEvents.length,
			archivedCount: archivedEvents.length,
			upcomingCount: upcomingEvents.length,
			attendanceRate,
		};
	}, [events, now]);

	return (
		<AdminShell
			currentSection="dashboard"
			eventsHref={eventsHref}
			newEventHref={newEventHref}
			dashboardHref="/admin/dashboard"
			onSignOut={onSignOut}
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-10 flex flex-col gap-8">
				{/* Header */}
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
					<div>
						<h1 className="font-serif italic text-3xl sm:text-4xl font-semibold text-primary">
							Resumen General
						</h1>
						<p className="text-secondary text-sm sm:text-base mt-1">
							Métricas consolidadas y estado de todas tus celebraciones.
						</p>
					</div>

					<div className="flex items-center gap-3">
						<a
							href={eventsHref}
							className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-stone-300 text-on-surface font-medium text-xs sm:text-sm hover:bg-stone-100 transition-colors shadow-2xs"
						>
							Ver todos los eventos
						</a>
						<a
							href={newEventHref}
							className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white font-medium text-xs sm:text-sm shadow-xs hover:opacity-90 transition-opacity focus-visible:ring-2 focus-visible:ring-primary"
						>
							<PlusIcon className="w-4 h-4" />
							<span>Crear evento</span>
						</a>
					</div>
				</div>

				{/* 4 Overview Metric Cards */}
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
					{/* Metric 1: Total Invitados */}
					<div className="bg-surface rounded-2xl p-6 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
						<div className="flex items-center justify-between text-secondary">
							<span className="text-xs font-semibold uppercase tracking-wider">
								Total Invitados
							</span>
							<div className="w-9 h-9 rounded-full bg-champagne-100 text-champagne-700 flex items-center justify-center">
								<UsersIcon className="w-5 h-5" />
							</div>
						</div>
						<div className="mt-4">
							<p className="font-serif text-3xl sm:text-4xl font-bold text-on-surface">
								{metrics.totalGuests}
							</p>
							<p className="text-xs text-secondary mt-1">
								En {events.length} {events.length === 1 ? "evento" : "eventos"}
							</p>
						</div>
					</div>

					{/* Metric 2: Confirmaciones */}
					<div className="bg-surface rounded-2xl p-6 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
						<div className="flex items-center justify-between text-secondary">
							<span className="text-xs font-semibold uppercase tracking-wider">
								Confirmaciones
							</span>
							<div className="w-9 h-9 rounded-full bg-success-bg text-success-green flex items-center justify-center">
								<CheckCircleIcon className="w-5 h-5" />
							</div>
						</div>
						<div className="mt-4">
							<p className="font-serif text-3xl sm:text-4xl font-bold text-on-surface">
								{metrics.totalAttending}
							</p>
							<p className="text-xs text-secondary mt-1">
								De {metrics.totalGuests} invitados totales
							</p>
						</div>
					</div>

					{/* Metric 3: Eventos Activos */}
					<div className="bg-surface rounded-2xl p-6 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
						<div className="flex items-center justify-between text-secondary">
							<span className="text-xs font-semibold uppercase tracking-wider">
								Próximos Eventos
							</span>
							<div className="w-9 h-9 rounded-full bg-champagne-100 text-champagne-700 flex items-center justify-center">
								<CalendarIcon className="w-5 h-5" />
							</div>
						</div>
						<div className="mt-4">
							<p className="font-serif text-3xl sm:text-4xl font-bold text-on-surface">
								{metrics.upcomingCount}
							</p>
							<p className="text-xs text-secondary mt-1">
								{metrics.draftCount} en borrador · {metrics.archivedCount}{" "}
								archivados
							</p>
						</div>
					</div>

					{/* Metric 4: Tasa de Asistencia */}
					<div className="bg-surface rounded-2xl p-6 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
						<div className="flex items-center justify-between text-secondary">
							<span className="text-xs font-semibold uppercase tracking-wider">
								Tasa de Asistencia
							</span>
							<div className="w-9 h-9 rounded-full bg-primary-container/30 text-primary flex items-center justify-center">
								<DashboardIcon className="w-5 h-5" />
							</div>
						</div>
						<div className="mt-4">
							<p className="font-serif text-3xl sm:text-4xl font-bold text-primary">
								{metrics.attendanceRate}%
							</p>
							<div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden mt-2">
								<div
									className="bg-primary h-full transition-all duration-300"
									style={{ width: `${metrics.attendanceRate}%` }}
								/>
							</div>
						</div>
					</div>
				</div>

				{/* Recent Events Section */}
				<div className="bg-surface rounded-2xl border border-stone-200/80 shadow-2xs p-6 flex flex-col gap-6">
					<div className="flex items-center justify-between">
						<h2 className="font-serif italic text-xl sm:text-2xl font-bold text-primary">
							Celebraciones
						</h2>
						<a
							href={eventsHref}
							className="text-xs sm:text-sm font-semibold text-primary hover:text-primary/80 transition-colors inline-flex items-center gap-1"
						>
							<span>Ver todos</span>
							<ArrowRightIcon className="w-4 h-4" />
						</a>
					</div>

					{events.length === 0 ? (
						<div className="py-12 text-center text-secondary">
							<p className="text-sm">
								Todavía no tienes ningún evento registrado.
							</p>
							<a
								href={newEventHref}
								className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs font-medium shadow-xs hover:opacity-90 transition-opacity"
							>
								<PlusIcon className="w-4 h-4" />
								<span>Crear primer evento</span>
							</a>
						</div>
					) : (
						<div className="divide-y divide-stone-200">
							{events.slice(0, 5).map((event) => (
								<div
									key={event.id}
									className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-stone-50/60 transition-colors rounded-xl px-3"
								>
									<div className="space-y-1">
										<a
											href={eventHref(event.id)}
											className="font-serif italic text-lg font-bold text-primary hover:underline"
										>
											{event.title}
										</a>
										<p className="text-xs text-secondary">
											{formatEventDate(event.startsAt)} ·{" "}
											{event.role === "owner" ? "Propietario" : "Editor"}
										</p>
									</div>

									<div className="flex items-center gap-4">
										<div className="text-right text-xs">
											<p className="font-semibold text-on-surface">
												{event.attendingCount} / {event.guestCount}
											</p>
											<p className="text-secondary">Confirmados</p>
										</div>

										<a
											href={eventHref(event.id)}
											className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium text-on-surface hover:bg-stone-100 transition-colors"
										>
											Gestionar
										</a>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</AdminShell>
	);
}
