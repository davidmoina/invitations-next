import type {
	AdminAuditEntry,
	AdminEventPageData,
} from "#/server/contracts/admin";
import type { ReserveGiftResult } from "#/server/contracts/public";
import { AdminShell } from "./components/admin/admin-shell";
import { CollaboratorsPanel } from "./components/admin/collaborators-panel";
import {
	EventSettingsForm,
	type UpdateEventInput,
} from "./components/admin/event-settings-form";
import { GiftForm, type GiftFormInput } from "./components/admin/gift-form";
import {
	type EditGiftInput,
	GiftReservations,
} from "./components/admin/gift-reservations";
import {
	GuestIntakeForm,
	type GuestIntakeInput,
} from "./components/admin/guest-intake-form";
import {
	answerLabel,
	type EditGuestInput,
	GuestList,
} from "./components/admin/guest-list";
import {
	CalendarIcon,
	ExternalLinkIcon,
	GiftIcon,
	MapPinIcon,
	UsersIcon,
} from "./components/icons";

export { answerLabel };
export type { EditGiftInput, EditGuestInput };

export type AdminEventShellProps = {
	data: AdminEventPageData;
	audit: AdminAuditEntry[];
	onUpdateEvent: (input: UpdateEventInput) => Promise<unknown>;
	onInvite: (email: string) => Promise<unknown>;
	onRemove: (userId: string) => Promise<unknown>;
	onTransfer: (userId: string) => Promise<unknown>;
	onSignOut: () => Promise<void>;
	/** Refusal RESOLVES with `{ ok: false }`; it does not throw. */
	onCancelReservation: (giftId: string) => Promise<ReserveGiftResult>;
	onCreateGift: (input: GiftFormInput) => Promise<{ id: string }>;
	onAddGuests: (guests: GuestIntakeInput[]) => Promise<unknown>;
	onDeleteEvent?: () => Promise<void>;
	onEditGift?: (input: EditGiftInput) => Promise<{ id: string }>;
	onEditGuest?: (input: EditGuestInput) => Promise<{ id: string }>;
	onIssueGuestLink?: (guestId: string) => Promise<{ url: string }>;
	onRefresh?: () => Promise<void> | void;
	homeHref?: string;
};

export function formatAuditEntry(entry: AdminAuditEntry): string {
	return `${entry.actor.label} — ${entry.action}`;
}

const STATUS_LABELS = {
	draft: "Borrador",
	published: "Publicado",
	archived: "Archivado",
};

const STATUS_CLASSES = {
	draft: "bg-warning-bg text-warning-amber border-warning-amber/30",
	published: "bg-success-bg text-success-green border-success-green/30",
	archived: "bg-stone-200 text-secondary border-stone-300",
};

function formatEventDate(isoString: string): string {
	try {
		return new Intl.DateTimeFormat("es-ES", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			timeZone: "UTC",
		}).format(new Date(isoString));
	} catch {
		return isoString;
	}
}

export function AdminEventShell({
	data,
	audit,
	onUpdateEvent,
	onInvite,
	onRemove,
	onTransfer,
	onSignOut,
	onCancelReservation,
	onCreateGift,
	onAddGuests,
	onDeleteEvent,
	onEditGift,
	onEditGuest,
	onIssueGuestLink,
	onRefresh,
	homeHref = "/admin",
}: AdminEventShellProps) {
	const totalGuests = data.summary.guestCount;
	const attendingGuests = data.summary.attendingCount;
	const declinedGuests = data.summary.declinedCount;
	const pendingGuests = data.summary.pendingCount;

	const attendingPercent =
		totalGuests > 0 ? Math.round((attendingGuests / totalGuests) * 100) : 0;
	const declinedPercent =
		totalGuests > 0 ? Math.round((declinedGuests / totalGuests) * 100) : 0;

	const totalGifts = data.summary.giftsReserved + data.summary.giftsAvailable;
	const giftsPercent =
		totalGifts > 0
			? Math.round((data.summary.giftsReserved / totalGifts) * 100)
			: 0;

	return (
		<AdminShell
			currentSection="events"
			currentEventTitle={data.event.title}
			currentEventDate={formatEventDate(data.event.startsAt)}
			eventsHref={homeHref}
			newEventHref="/admin/new"
			dashboardHref="/admin/dashboard"
			onSignOut={onSignOut}
		>
			<div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-8">
				{/* Hero Header */}
				<header className="bg-surface rounded-3xl p-6 sm:p-8 border border-stone-200/80 shadow-2xs relative overflow-hidden flex flex-col gap-6">
					<div className="flex flex-wrap items-center justify-between gap-4">
						{/* Breadcrumb */}
						<nav aria-label="Miga de pan" className="text-xs text-secondary">
							<ol className="flex items-center gap-2">
								<li>
									<a
										href={homeHref}
										className="hover:text-primary transition-colors font-medium"
									>
										Eventos
									</a>
								</li>
								<li aria-hidden="true" className="text-stone-400">
									›
								</li>
								<li className="font-semibold text-primary truncate max-w-xs sm:max-w-md">
									{data.event.title}
								</li>
							</ol>
						</nav>

						{/* Status Badge */}
						<span
							className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border shadow-2xs ${
								STATUS_CLASSES[data.event.status]
							}`}
						>
							{STATUS_LABELS[data.event.status]}
						</span>
					</div>

					<div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
						<div className="space-y-2">
							<h1 className="font-serif italic text-3xl sm:text-4xl lg:text-5xl font-bold text-primary leading-tight">
								{data.event.title}
							</h1>
							<div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-secondary">
								<div className="flex items-center gap-1.5">
									<CalendarIcon className="w-4 h-4 text-champagne-700" />
									<span className="capitalize">
										{formatEventDate(data.event.startsAt)}
									</span>
								</div>
								{data.event.venueName ? (
									<div className="flex items-center gap-1.5">
										<MapPinIcon className="w-4 h-4 text-champagne-700" />
										<span>{data.event.venueName}</span>
									</div>
								) : null}
							</div>
						</div>

						<div className="flex items-center gap-3">
							<a
								href={`/e/${data.event.slug}`}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container border border-stone-300 text-on-surface font-semibold text-xs sm:text-sm hover:bg-stone-100 transition-colors shadow-2xs focus-visible:ring-2 focus-visible:ring-primary"
							>
								<span>Ver invitación pública</span>
								<ExternalLinkIcon className="w-4 h-4" />
							</a>
						</div>
					</div>
				</header>

				{/* KPI Cards Grid */}
				<section
					aria-label="Métricas del evento"
					className="grid grid-cols-1 md:grid-cols-3 gap-6"
				>
					{/* KPI 1: Total Invitados */}
					<div className="bg-surface rounded-2xl p-6 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
						<div className="flex items-center justify-between text-secondary">
							<h2 className="font-serif text-sm font-semibold text-secondary">
								Total Invitados
							</h2>
							<div className="w-9 h-9 rounded-full bg-champagne-100 text-champagne-700 flex items-center justify-center">
								<UsersIcon className="w-5 h-5" />
							</div>
						</div>
						<div className="mt-4">
							<p className="font-serif text-3xl sm:text-4xl font-bold text-on-surface">
								{data.summary.guestCount}
							</p>
							<p className="text-xs text-secondary mt-1">
								{data.summary.attendingCount} asistentes confirmados ·{" "}
								{data.summary.totalAttendees} personas en total
							</p>
						</div>
					</div>

					{/* KPI 2: Estado de RSVP */}
					<div className="bg-surface rounded-2xl p-6 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
						<div className="flex items-center justify-between text-secondary">
							<h2 className="font-serif text-sm font-semibold text-secondary">
								Estado de RSVP
							</h2>
							<div className="w-9 h-9 rounded-full bg-success-bg text-success-green flex items-center justify-center">
								<UsersIcon className="w-5 h-5" />
							</div>
						</div>
						<div className="mt-4 space-y-2">
							<div className="flex items-baseline gap-2">
								<span className="font-serif text-3xl sm:text-4xl font-bold text-on-surface">
									{attendingGuests}
								</span>
								<span className="text-xs text-secondary">
									/ {totalGuests} confirmados
								</span>
							</div>
							<div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden flex">
								<div
									className="bg-success-green h-full transition-all duration-300"
									style={{ width: `${attendingPercent}%` }}
								/>
								<div
									className="bg-error h-full transition-all duration-300"
									style={{ width: `${declinedPercent}%` }}
								/>
							</div>
							<div className="flex items-center justify-between text-[11px] text-secondary pt-1">
								<span>Asistirán ({attendingGuests})</span>
								<span>No asistirán ({declinedGuests})</span>
								<span>Pendientes ({pendingGuests})</span>
							</div>
						</div>
					</div>

					{/* KPI 3: Mesa de Regalos */}
					<div className="bg-surface rounded-2xl p-6 border border-stone-200/80 shadow-2xs flex flex-col justify-between">
						<div className="flex items-center justify-between text-secondary">
							<h2 className="font-serif text-sm font-semibold text-secondary">
								Mesa de Regalos
							</h2>
							<div className="w-9 h-9 rounded-full bg-primary-container/30 text-primary flex items-center justify-center">
								<GiftIcon className="w-5 h-5" />
							</div>
						</div>
						<div className="mt-4 space-y-2">
							{data.event.giftRegistryEnabled ? (
								<>
									<div className="flex items-baseline gap-2">
										<span className="font-serif text-3xl sm:text-4xl font-bold text-primary">
											{data.summary.giftsReserved}
										</span>
										<span className="text-xs text-secondary">
											/ {totalGifts} reservados
										</span>
									</div>
									<div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
										<div
											className="bg-primary h-full transition-all duration-300"
											style={{ width: `${giftsPercent}%` }}
										/>
									</div>
									<p className="text-[11px] text-secondary">
										{data.summary.giftsAvailable} regalos disponibles para
										reserva
									</p>
								</>
							) : (
								<p className="text-sm text-secondary font-medium py-2">
									Mesa de regalos desactivada
								</p>
							)}
						</div>
					</div>
				</section>

				{/* Guest Management */}
				<GuestList
					guests={data.guests}
					onEditGuest={onEditGuest}
					onRefresh={onRefresh}
					onIssueGuestLink={onIssueGuestLink}
				/>

				<GuestIntakeForm onAddGuests={onAddGuests} />

				{/* Registry Section */}
				<GiftReservations
					gifts={data.gifts}
					onCancelReservation={onCancelReservation}
					onEditGift={onEditGift}
					onRefresh={onRefresh}
				/>

				<GiftForm onCreateGift={onCreateGift} />

				{/* Collaborators Panel */}
				<CollaboratorsPanel
					memberships={data.memberships}
					viewerRole={data.viewerRole}
					onInvite={onInvite}
					onRemove={onRemove}
					onTransfer={onTransfer}
				/>

				{/* Event Settings & Danger Zone */}
				<EventSettingsForm
					event={data.event}
					viewerRole={data.viewerRole}
					onUpdateEvent={onUpdateEvent}
					onDeleteEvent={onDeleteEvent}
				/>

				{/* Dedications */}
				<section
					aria-label="Dedicatorias"
					className="p-6 bg-surface rounded-2xl border border-stone-200/80 shadow-2xs space-y-4"
				>
					<h2 className="font-serif italic text-2xl font-bold text-primary">
						Dedicatorias
					</h2>
					{data.messages.length === 0 ? (
						<p className="text-sm text-secondary">Todavía no hay mensajes.</p>
					) : (
						<ul className="space-y-3">
							{data.messages.map((message) => (
								<li
									key={message.id}
									className="p-4 bg-stone-50 rounded-xl border border-stone-200/70"
								>
									<p className="text-sm text-on-surface">{message.body}</p>
									<p className="text-xs text-secondary mt-1 font-medium">
										— {message.guestDisplayName}
									</p>
								</li>
							))}
						</ul>
					)}
				</section>

				{/* Audit Log */}
				<section
					aria-label="Auditoría"
					className="p-6 bg-surface rounded-2xl border border-stone-200/80 shadow-2xs space-y-4"
				>
					<h2 className="font-serif italic text-2xl font-bold text-primary">
						Auditoría
					</h2>
					<ul className="space-y-1.5 divide-y divide-stone-100">
						{audit.map((entry) => (
							<li key={entry.id} className="pt-1.5 text-xs text-secondary">
								{formatAuditEntry(entry)}
							</li>
						))}
					</ul>
				</section>
			</div>
		</AdminShell>
	);
}
