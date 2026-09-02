"use client";
import { useState } from "react";

import type { AdminEvent, EventDetails } from "#/server/contracts/admin";
import {
	BABY_SEXES,
	type BabySex,
	EVENT_TYPES,
	type EventType,
} from "#/server/contracts/event-types";
import {
	BABY_SEX_LABELS,
	EVENT_TYPE_LABELS,
	FIELD_CLASS,
	LABEL_CLASS,
	orNull,
	toIso,
	toLocalInput,
} from "./event-form-fields";

/** Everything an organizer may edit: the identity fields are not editable. */
export type UpdateEventInput = Omit<AdminEvent, "id" | "slug" | "updatedAt">;

export type EventSettingsFormProps = {
	event: AdminEvent;
	/** Failure arrives as a rejection; the resolved value is not used. */
	onUpdateEvent: (input: UpdateEventInput) => Promise<unknown>;
	viewerRole?: "owner" | "editor";
	isOwner?: boolean;
	onDeleteEvent?: () => Promise<void>;
};

type HonoreeItem = {
	id: string;
	name: string;
};

let nextHonoreeId = 1;

export function EventSettingsForm({
	event,
	onUpdateEvent,
	viewerRole,
	isOwner: isOwnerProp,
	onDeleteEvent,
}: EventSettingsFormProps) {
	const isOwner =
		viewerRole !== undefined
			? viewerRole === "owner"
			: (isOwnerProp ?? Boolean(onDeleteEvent));

	const initialDueDate =
		event.details.type === "baby_shower" ? event.details.dueDate : "";
	const initialBabySex =
		event.details.type === "baby_shower" ? (event.details.babySex ?? "") : "";
	const initialTurningAge =
		event.details.type === "birthday" && event.details.turningAge !== null
			? String(event.details.turningAge)
			: "";

	const [form, setForm] = useState<{
		title: string;
		eventType: EventType;
		honorees: HonoreeItem[];
		dueDate: string;
		babySex: BabySex | "";
		turningAge: string;
		startsAt: string;
		timezone: string;
		venueName: string;
		venueAddress: string;
		venueMapUrl: string;
		description: string;
		maxCompanions: number;
		giftRegistryEnabled: boolean;
		rsvpDeadline: string;
		status: AdminEvent["status"];
	}>({
		title: event.title,
		eventType: event.eventType,
		honorees:
			event.honoreeNames.length > 0
				? event.honoreeNames.map((name, i) => ({
						id: `honoree-init-${i}`,
						name,
					}))
				: [{ id: "honoree-init-0", name: "" }],
		dueDate: initialDueDate,
		babySex: initialBabySex,
		turningAge: initialTurningAge,
		startsAt: toLocalInput(event.startsAt),
		timezone: event.timezone,
		venueName: event.venueName ?? "",
		venueAddress: event.venueAddress ?? "",
		venueMapUrl: event.venueMapUrl ?? "",
		description: event.description ?? "",
		maxCompanions: event.maxCompanions,
		giftRegistryEnabled: event.giftRegistryEnabled,
		rsvpDeadline: toLocalInput(event.rsvpDeadline),
		status: event.status,
	});
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [deleting, setDeleting] = useState(false);
	const [deleted, setDeleted] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	const handleDelete = async () => {
		if (!onDeleteEvent || deleting) return;
		setDeleting(true);
		setDeleteError(null);
		try {
			await onDeleteEvent();
			setDeleted(true);
			setConfirmingDelete(false);
		} catch {
			setDeleteError("No hemos podido archivar el evento. Inténtalo de nuevo.");
		} finally {
			setDeleting(false);
		}
	};

	const set = <K extends keyof typeof form>(
		key: K,
		value: (typeof form)[K],
	) => {
		setForm((current) => ({ ...current, [key]: value }));
		setSaved(false);
	};

	const handleEventTypeChange = (newType: EventType) => {
		setForm((current) => ({
			...current,
			eventType: newType,
			dueDate: "",
			babySex: "",
			turningAge: "",
		}));
		setSaved(false);
	};

	const updateHonoree = (id: string, value: string) => {
		setForm((current) => ({
			...current,
			honorees: current.honorees.map((item) =>
				item.id === id ? { ...item, name: value } : item,
			),
		}));
		setSaved(false);
	};

	const addHonoree = () => {
		setForm((current) => ({
			...current,
			honorees: [
				...current.honorees,
				{ id: `honoree-${nextHonoreeId++}`, name: "" },
			],
		}));
		setSaved(false);
	};

	const removeHonoree = (id: string) => {
		setForm((current) => ({
			...current,
			honorees: current.honorees.filter((item) => item.id !== id),
		}));
		setSaved(false);
	};

	const handleSubmit = async (submitEvent: React.FormEvent) => {
		submitEvent.preventDefault();
		if (saving) return;
		setSaving(true);
		setError(null);
		setSaved(false);
		try {
			let details: EventDetails;
			if (form.eventType === "wedding") {
				details = { type: "wedding" };
			} else if (form.eventType === "baby_shower") {
				details = {
					type: "baby_shower",
					dueDate: form.dueDate.trim(),
					babySex: form.babySex ? form.babySex : null,
				};
			} else if (form.eventType === "birthday") {
				const trimmedAge = form.turningAge.trim();
				details = {
					type: "birthday",
					turningAge: trimmedAge === "" ? null : Number(trimmedAge),
				};
			} else {
				details = { type: "other" };
			}

			const honoreeNames = form.honorees
				.map((item) => item.name.trim())
				.filter((name) => name !== "");

			// The whole event goes over, not a patch: the use case replaces the
			// row, so an omitted field would read as a cleared one.
			await onUpdateEvent({
				title: form.title.trim(),
				eventType: form.eventType,
				honoreeNames,
				details,
				startsAt: toIso(form.startsAt) ?? event.startsAt,
				timezone: form.timezone.trim(),
				venueName: orNull(form.venueName),
				venueAddress: orNull(form.venueAddress),
				venueMapUrl: orNull(form.venueMapUrl),
				description: orNull(form.description),
				maxCompanions: form.maxCompanions,
				giftRegistryEnabled: form.giftRegistryEnabled,
				rsvpDeadline: toIso(form.rsvpDeadline),
				status: form.status,
			});
			setSaved(true);
		} catch {
			// Never echo the raw failure: it can carry internal detail.
			setError("No hemos podido guardar los cambios. Inténtalo de nuevo.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<section
			aria-label="Datos del evento"
			className="px-4 py-6 border-t border-stone-200/80"
		>
			<h2 className="font-serif text-xl text-primary font-semibold mb-4">
				Datos del evento
			</h2>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label htmlFor="event-title" className={LABEL_CLASS}>
						Título
					</label>
					<input
						id="event-title"
						value={form.title}
						onChange={(e) => set("title", e.target.value)}
						className={FIELD_CLASS}
					/>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label htmlFor="event-type" className={LABEL_CLASS}>
							Tipo de celebración
						</label>
						<select
							id="event-type"
							value={form.eventType}
							onChange={(e) =>
								handleEventTypeChange(e.target.value as EventType)
							}
							className={FIELD_CLASS}
						>
							{EVENT_TYPES.map((type) => (
								<option key={type} value={type}>
									{EVENT_TYPE_LABELS[type]}
								</option>
							))}
						</select>
					</div>
					<div>
						<label htmlFor="event-timezone" className={LABEL_CLASS}>
							Zona horaria
						</label>
						<input
							id="event-timezone"
							value={form.timezone}
							onChange={(e) => set("timezone", e.target.value)}
							className={FIELD_CLASS}
						/>
					</div>
					<div>
						<label htmlFor="event-starts-at" className={LABEL_CLASS}>
							Fecha y hora
						</label>
						<input
							id="event-starts-at"
							type="datetime-local"
							value={form.startsAt}
							onChange={(e) => set("startsAt", e.target.value)}
							className={FIELD_CLASS}
						/>
					</div>
					<div>
						<label htmlFor="event-rsvp-deadline" className={LABEL_CLASS}>
							Fecha límite de confirmación
						</label>
						<input
							id="event-rsvp-deadline"
							type="datetime-local"
							value={form.rsvpDeadline}
							onChange={(e) => set("rsvpDeadline", e.target.value)}
							className={FIELD_CLASS}
						/>
					</div>
				</div>

				{form.eventType === "baby_shower" && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
						<div>
							<label htmlFor="event-due-date" className={LABEL_CLASS}>
								Fecha prevista de parto
							</label>
							<input
								id="event-due-date"
								type="date"
								value={form.dueDate}
								onChange={(e) => set("dueDate", e.target.value)}
								className={FIELD_CLASS}
							/>
						</div>
						<div>
							<label htmlFor="event-baby-sex" className={LABEL_CLASS}>
								Sexo del bebé
							</label>
							<select
								id="event-baby-sex"
								value={form.babySex}
								onChange={(e) => set("babySex", e.target.value as BabySex | "")}
								className={FIELD_CLASS}
							>
								<option value="">Sin especificar</option>
								{BABY_SEXES.map((sex) => (
									<option key={sex} value={sex}>
										{BABY_SEX_LABELS[sex]}
									</option>
								))}
							</select>
						</div>
					</div>
				)}

				{form.eventType === "birthday" && (
					<div className="p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
						<label htmlFor="event-turning-age" className={LABEL_CLASS}>
							Edad que cumple
						</label>
						<input
							id="event-turning-age"
							type="number"
							min={0}
							value={form.turningAge}
							onChange={(e) => set("turningAge", e.target.value)}
							className={FIELD_CLASS}
						/>
					</div>
				)}

				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<span className={LABEL_CLASS}>Personas homenajeadas</span>
						<button
							type="button"
							onClick={addHonoree}
							className="text-xs font-medium text-primary hover:underline"
						>
							Añadir persona homenajeada
						</button>
					</div>
					{form.honorees.map((item, index) => (
						<div key={item.id} className="flex items-center gap-2">
							<input
								id={`event-honoree-${index}`}
								aria-label={`Persona homenajeada ${index + 1}`}
								value={item.name}
								onChange={(e) => updateHonoree(item.id, e.target.value)}
								placeholder={`Persona homenajeada ${index + 1}`}
								className={FIELD_CLASS}
							/>
							{form.honorees.length > 1 && (
								<button
									type="button"
									onClick={() => removeHonoree(item.id)}
									aria-label={`Eliminar homenajeado ${index + 1}`}
									className="px-2 py-2 text-xs text-secondary hover:text-red-700"
								>
									Eliminar
								</button>
							)}
						</div>
					))}
				</div>

				<div>
					<label htmlFor="event-venue-name" className={LABEL_CLASS}>
						Lugar
					</label>
					<input
						id="event-venue-name"
						value={form.venueName}
						onChange={(e) => set("venueName", e.target.value)}
						className={FIELD_CLASS}
					/>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label htmlFor="event-venue-address" className={LABEL_CLASS}>
							Dirección
						</label>
						<input
							id="event-venue-address"
							value={form.venueAddress}
							onChange={(e) => set("venueAddress", e.target.value)}
							className={FIELD_CLASS}
						/>
					</div>
					<div>
						<label htmlFor="event-venue-map" className={LABEL_CLASS}>
							Enlace al mapa
						</label>
						<input
							id="event-venue-map"
							type="url"
							value={form.venueMapUrl}
							onChange={(e) => set("venueMapUrl", e.target.value)}
							className={FIELD_CLASS}
						/>
					</div>
				</div>

				<div>
					<label htmlFor="event-description" className={LABEL_CLASS}>
						Descripción
					</label>
					<textarea
						id="event-description"
						rows={3}
						value={form.description}
						onChange={(e) => set("description", e.target.value)}
						className={FIELD_CLASS}
					/>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label htmlFor="event-max-companions" className={LABEL_CLASS}>
							Máximo de acompañantes
						</label>
						<input
							id="event-max-companions"
							type="number"
							min={0}
							value={form.maxCompanions}
							onChange={(e) =>
								set("maxCompanions", Math.max(0, Number(e.target.value) || 0))
							}
							className={FIELD_CLASS}
						/>
					</div>
					<div>
						<label htmlFor="event-status" className={LABEL_CLASS}>
							Estado
						</label>
						<select
							id="event-status"
							value={form.status}
							onChange={(e) =>
								set("status", e.target.value as AdminEvent["status"])
							}
							className={FIELD_CLASS}
						>
							<option value="draft">Borrador</option>
							<option value="published">Publicado</option>
							{event.status === "archived" && (
								<option value="archived" disabled>
									Archivado
								</option>
							)}
						</select>
					</div>
				</div>

				<label
					htmlFor="event-gift-registry"
					className="flex items-center gap-2 text-sm text-on-surface"
				>
					<input
						id="event-gift-registry"
						type="checkbox"
						checked={form.giftRegistryEnabled}
						onChange={(e) => set("giftRegistryEnabled", e.target.checked)}
					/>
					Mostrar la lista de regalos
				</label>

				{error && (
					<p
						role="alert"
						className="p-3 bg-error-container text-error rounded-xl text-xs font-medium"
					>
						{error}
					</p>
				)}
				{saved && (
					<output className="p-3 bg-champagne-50 text-primary rounded-xl text-xs font-medium block">
						Cambios guardados.
					</output>
				)}

				<button
					type="submit"
					disabled={saving}
					className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-40"
				>
					{saving ? "Guardando..." : "Guardar cambios"}
				</button>
			</form>

			{isOwner && (
				<div className="mt-8 bg-error-container/20 border border-error/20 rounded-xl p-6">
					<h3 className="font-medium text-error text-sm mb-2 flex items-center gap-2">
						Zona de peligro
					</h3>
					<div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
						<div className="text-sm font-body-md text-on-surface-variant">
							<p className="mb-2">
								<strong>Archivar este evento.</strong>
							</p>
							<p className="max-w-md">
								Archivar el evento ocultará la invitación pública y detendrá las
								confirmaciones. Los datos del evento seguirán accesibles en modo
								solo lectura.
							</p>
						</div>
						{confirmingDelete ? (
							<div className="space-y-3 shrink-0">
								<p className="text-xs font-semibold text-error">
									¿Seguro que deseas archivar este evento? Esta acción es
									irreversible.
								</p>
								<div className="flex items-center gap-2">
									<button
										type="button"
										disabled={deleting}
										onClick={handleDelete}
										className="px-4 py-2 bg-error text-white rounded-lg text-sm font-medium hover:bg-error/90 transition-colors disabled:opacity-40"
									>
										{deleting ? "Archivando…" : "Confirmar archivado"}
									</button>
									<button
										type="button"
										disabled={deleting}
										onClick={() => {
											setConfirmingDelete(false);
											setDeleteError(null);
										}}
										className="px-4 py-2 border border-stone-300 rounded-lg text-sm font-medium text-on-surface hover:bg-stone-50 transition-colors disabled:opacity-40"
									>
										Cancelar
									</button>
								</div>
							</div>
						) : (
							<button
								type="button"
								disabled={deleting || event.status === "archived" || deleted}
								onClick={() => {
									setConfirmingDelete(true);
									setDeleteError(null);
								}}
								className="px-4 py-2 border border-error/30 text-error hover:bg-error-container/50 rounded-lg text-sm font-medium transition-colors shrink-0 disabled:opacity-40"
							>
								{event.status === "archived" || deleted
									? "Evento archivado"
									: "Archivar evento"}
							</button>
						)}
					</div>
					{deleteError && (
						<p
							role="alert"
							className="mt-3 p-3 bg-error-container text-error rounded-xl text-xs font-medium"
						>
							{deleteError}
						</p>
					)}
					{deleted && (
						<output className="mt-3 p-3 bg-champagne-50 text-primary rounded-xl text-xs font-medium block">
							El evento ha sido archivado correctamente.
						</output>
					)}
				</div>
			)}
		</section>
	);
}
