"use client";
import { useState } from "react";

import type {
	CreatedEvent,
	EventDetails,
	NewEventInput,
} from "#/server/contracts/admin";
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
} from "./event-form-fields";

export type CreateEventFormProps = {
	/** Resolves with the created event so the route can navigate to it. */
	onCreateEvent: (input: NewEventInput) => Promise<CreatedEvent>;
};

type HonoreeItem = {
	id: string;
	name: string;
};

let nextHonoreeId = 1;

/** The organizer's own zone is the right default; the field stays editable. */
function currentTimezone(): string {
	try {
		return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
	} catch {
		return "UTC";
	}
}

export function CreateEventForm({ onCreateEvent }: CreateEventFormProps) {
	const [form, setForm] = useState<{
		title: string;
		eventType: EventType | "";
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
	}>({
		title: "",
		eventType: "",
		honorees: [{ id: "honoree-init-1", name: "" }],
		dueDate: "",
		babySex: "",
		turningAge: "",
		startsAt: "",
		timezone: currentTimezone(),
		venueName: "",
		venueAddress: "",
		venueMapUrl: "",
		description: "",
		maxCompanions: 0,
		giftRegistryEnabled: true,
		rsvpDeadline: "",
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const set = <K extends keyof typeof form>(
		key: K,
		value: (typeof form)[K],
	) => {
		setForm((current) => ({ ...current, [key]: value }));
	};

	const handleEventTypeChange = (newType: EventType | "") => {
		setForm((current) => ({
			...current,
			eventType: newType,
			dueDate: "",
			babySex: "",
			turningAge: "",
		}));
	};

	const updateHonoree = (id: string, value: string) => {
		setForm((current) => ({
			...current,
			honorees: current.honorees.map((item) =>
				item.id === id ? { ...item, name: value } : item,
			),
		}));
	};

	const addHonoree = () => {
		setForm((current) => ({
			...current,
			honorees: [
				...current.honorees,
				{ id: `honoree-${nextHonoreeId++}`, name: "" },
			],
		}));
	};

	const removeHonoree = (id: string) => {
		setForm((current) => ({
			...current,
			honorees: current.honorees.filter((item) => item.id !== id),
		}));
	};

	const handleSubmit = async (submitEvent: React.FormEvent) => {
		submitEvent.preventDefault();
		if (submitting) return;

		// Caught here so an obviously incomplete form costs no round-trip. The
		// server validates the same fields again: this is convenience, never
		// the enforcement.
		const title = form.title.trim();
		if (title === "") {
			setError("Pon un título al evento.");
			return;
		}
		if (form.eventType === "") {
			setError("Selecciona el tipo de celebración.");
			return;
		}
		const startsAt = toIso(form.startsAt);
		if (startsAt === null) {
			setError("Indica la fecha y la hora del evento.");
			return;
		}

		let details: EventDetails;
		if (form.eventType === "wedding") {
			details = { type: "wedding" };
		} else if (form.eventType === "baby_shower") {
			const dueDate = form.dueDate.trim();
			if (dueDate === "") {
				setError("Indica la fecha prevista de parto.");
				return;
			}
			details = {
				type: "baby_shower",
				dueDate,
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

		setSubmitting(true);
		setError(null);
		try {
			await onCreateEvent({
				title,
				eventType: form.eventType,
				honoreeNames,
				details,
				startsAt,
				timezone: form.timezone.trim(),
				venueName: orNull(form.venueName),
				venueAddress: orNull(form.venueAddress),
				venueMapUrl: orNull(form.venueMapUrl),
				description: orNull(form.description),
				maxCompanions: form.maxCompanions,
				giftRegistryEnabled: form.giftRegistryEnabled,
				rsvpDeadline: toIso(form.rsvpDeadline),
			});
		} catch {
			// Never echo the raw failure: it can carry internal detail.
			setError("No hemos podido crear el evento. Inténtalo de nuevo.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<section aria-label="Nuevo evento" className="max-w-2xl mx-auto px-4 py-10">
			<h1 className="font-serif text-2xl text-primary font-semibold mb-6">
				Crear un evento
			</h1>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label htmlFor="new-event-title" className={LABEL_CLASS}>
						Título
					</label>
					<input
						id="new-event-title"
						value={form.title}
						onChange={(e) => set("title", e.target.value)}
						className={FIELD_CLASS}
					/>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label htmlFor="new-event-type" className={LABEL_CLASS}>
							Tipo de celebración
						</label>
						<select
							id="new-event-type"
							value={form.eventType}
							onChange={(e) =>
								handleEventTypeChange(e.target.value as EventType | "")
							}
							className={FIELD_CLASS}
						>
							<option value="">Selecciona un tipo de celebración</option>
							{EVENT_TYPES.map((type) => (
								<option key={type} value={type}>
									{EVENT_TYPE_LABELS[type]}
								</option>
							))}
						</select>
					</div>
					<div>
						<label htmlFor="new-event-timezone" className={LABEL_CLASS}>
							Zona horaria
						</label>
						<input
							id="new-event-timezone"
							value={form.timezone}
							onChange={(e) => set("timezone", e.target.value)}
							className={FIELD_CLASS}
						/>
					</div>
				</div>

				{form.eventType === "baby_shower" && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
						<div>
							<label htmlFor="new-event-due-date" className={LABEL_CLASS}>
								Fecha prevista de parto
							</label>
							<input
								id="new-event-due-date"
								type="date"
								value={form.dueDate}
								onChange={(e) => set("dueDate", e.target.value)}
								className={FIELD_CLASS}
							/>
						</div>
						<div>
							<label htmlFor="new-event-baby-sex" className={LABEL_CLASS}>
								Sexo del bebé
							</label>
							<select
								id="new-event-baby-sex"
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
						<label htmlFor="new-event-turning-age" className={LABEL_CLASS}>
							Edad que cumple
						</label>
						<input
							id="new-event-turning-age"
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
								id={`new-event-honoree-${index}`}
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

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label htmlFor="new-event-starts-at" className={LABEL_CLASS}>
							Fecha y hora
						</label>
						<input
							id="new-event-starts-at"
							type="datetime-local"
							value={form.startsAt}
							onChange={(e) => set("startsAt", e.target.value)}
							className={FIELD_CLASS}
						/>
					</div>
					<div>
						<label htmlFor="new-event-rsvp-deadline" className={LABEL_CLASS}>
							Fecha límite de confirmación
						</label>
						<input
							id="new-event-rsvp-deadline"
							type="datetime-local"
							value={form.rsvpDeadline}
							onChange={(e) => set("rsvpDeadline", e.target.value)}
							className={FIELD_CLASS}
						/>
					</div>
				</div>

				<div>
					<label htmlFor="new-event-venue-name" className={LABEL_CLASS}>
						Lugar
					</label>
					<input
						id="new-event-venue-name"
						value={form.venueName}
						onChange={(e) => set("venueName", e.target.value)}
						className={FIELD_CLASS}
					/>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<div>
						<label htmlFor="new-event-venue-address" className={LABEL_CLASS}>
							Dirección
						</label>
						<input
							id="new-event-venue-address"
							value={form.venueAddress}
							onChange={(e) => set("venueAddress", e.target.value)}
							className={FIELD_CLASS}
						/>
					</div>
					<div>
						<label htmlFor="new-event-venue-map-url" className={LABEL_CLASS}>
							Enlace al mapa
						</label>
						<input
							id="new-event-venue-map-url"
							type="url"
							value={form.venueMapUrl}
							onChange={(e) => set("venueMapUrl", e.target.value)}
							className={FIELD_CLASS}
						/>
					</div>
				</div>

				<div>
					<label htmlFor="new-event-description" className={LABEL_CLASS}>
						Descripción
					</label>
					<textarea
						id="new-event-description"
						value={form.description}
						onChange={(e) => set("description", e.target.value)}
						rows={3}
						className={FIELD_CLASS}
					/>
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
					<div>
						<label htmlFor="new-event-max-companions" className={LABEL_CLASS}>
							Acompañantes máximos por invitado
						</label>
						<input
							id="new-event-max-companions"
							type="number"
							min={0}
							value={form.maxCompanions}
							onChange={(e) =>
								set("maxCompanions", Number(e.target.value) || 0)
							}
							className={FIELD_CLASS}
						/>
					</div>
					<label
						htmlFor="new-event-gift-registry"
						className="flex items-center gap-2 text-sm text-secondary pb-2"
					>
						<input
							id="new-event-gift-registry"
							type="checkbox"
							checked={form.giftRegistryEnabled}
							onChange={(e) => set("giftRegistryEnabled", e.target.checked)}
							className="rounded border-stone-300"
						/>
						Activar lista de regalos
					</label>
				</div>

				{error ? (
					<p role="alert" className="text-sm text-red-700">
						{error}
					</p>
				) : null}

				<button
					type="submit"
					disabled={submitting}
					className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium disabled:opacity-60"
				>
					{submitting ? "Creando…" : "Crear evento"}
				</button>
			</form>
		</section>
	);
}
