"use client";
import {
	Button,
	Checkbox,
	Input,
	Label,
	ListBox,
	NumberField,
	Select,
	TextArea,
	TextField,
} from "@heroui/react";
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
import { VenueAddressField } from "./venue-address-field";

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
				<TextField className="space-y-1">
					<Label htmlFor="new-event-title" className={LABEL_CLASS}>
						Título
					</Label>
					<Input
						id="new-event-title"
						value={form.title}
						onChange={(e) => set("title", e.target.value)}
						className={FIELD_CLASS}
					/>
				</TextField>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<Select
						name="eventType"
						selectedKey={form.eventType || null}
						onSelectionChange={(key) =>
							handleEventTypeChange((key as EventType) || "")
						}
						placeholder="Selecciona un tipo de celebración"
						className="w-full"
					>
						<Label className={LABEL_CLASS}>Tipo de celebración</Label>
						<Select.Trigger id="new-event-type" className="w-full">
							<Select.Value />
							<Select.Indicator />
						</Select.Trigger>
						<Select.Popover>
							<ListBox>
								{EVENT_TYPES.map((type) => (
									<ListBox.Item
										key={type}
										id={type}
										textValue={EVENT_TYPE_LABELS[type]}
									>
										{EVENT_TYPE_LABELS[type]}
										<ListBox.ItemIndicator />
									</ListBox.Item>
								))}
							</ListBox>
						</Select.Popover>
					</Select>
					<TextField className="space-y-1">
						<Label htmlFor="new-event-timezone" className={LABEL_CLASS}>
							Zona horaria
						</Label>
						<Input
							id="new-event-timezone"
							value={form.timezone}
							onChange={(e) => set("timezone", e.target.value)}
							className={FIELD_CLASS}
						/>
					</TextField>
				</div>

				{form.eventType === "baby_shower" && (
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-stone-50 border border-stone-200/60">
						<TextField className="space-y-1">
							<Label htmlFor="new-event-due-date" className={LABEL_CLASS}>
								Fecha prevista de parto
							</Label>
							<Input
								id="new-event-due-date"
								type="date"
								value={form.dueDate}
								onChange={(e) => set("dueDate", e.target.value)}
								className={FIELD_CLASS}
							/>
						</TextField>
						<Select
							name="babySex"
							selectedKey={form.babySex || null}
							onSelectionChange={(key) =>
								set("babySex", (key as BabySex) || "")
							}
							placeholder="Sin especificar"
							className="w-full"
						>
							<Label className={LABEL_CLASS}>Sexo del bebé</Label>
							<Select.Trigger id="new-event-baby-sex" className="w-full">
								<Select.Value />
								<Select.Indicator />
							</Select.Trigger>
							<Select.Popover>
								<ListBox>
									{BABY_SEXES.map((sex) => (
										<ListBox.Item
											key={sex}
											id={sex}
											textValue={BABY_SEX_LABELS[sex]}
										>
											{BABY_SEX_LABELS[sex]}
											<ListBox.ItemIndicator />
										</ListBox.Item>
									))}
								</ListBox>
							</Select.Popover>
						</Select>
					</div>
				)}

				{form.eventType === "birthday" && (
					<NumberField
						id="new-event-turning-age"
						minValue={0}
						value={form.turningAge === "" ? NaN : Number(form.turningAge)}
						onChange={(val) =>
							set("turningAge", Number.isNaN(val) ? "" : String(val))
						}
						className="p-4 rounded-2xl bg-stone-50 border border-stone-200/60 space-y-1"
					>
						<Label htmlFor="new-event-turning-age" className={LABEL_CLASS}>
							Edad que cumple
						</Label>
						<NumberField.Input
							id="new-event-turning-age"
							type="number"
							className={FIELD_CLASS}
						/>
					</NumberField>
				)}

				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<span className={LABEL_CLASS}>Personas homenajeadas</span>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onPress={addHonoree}
						>
							Añadir persona homenajeada
						</Button>
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
								<Button
									type="button"
									variant="danger"
									size="sm"
									aria-label={`Eliminar homenajeado ${index + 1}`}
									onPress={() => removeHonoree(item.id)}
								>
									Eliminar
								</Button>
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

				<TextField className="space-y-1">
					<Label htmlFor="new-event-venue-name" className={LABEL_CLASS}>
						Lugar
					</Label>
					<Input
						id="new-event-venue-name"
						value={form.venueName}
						onChange={(e) => set("venueName", e.target.value)}
						className={FIELD_CLASS}
					/>
				</TextField>

				<VenueAddressField
					address={form.venueAddress}
					mapUrl={form.venueMapUrl}
					onChange={(next) => {
						set("venueAddress", next.address);
						set("venueMapUrl", next.mapUrl);
					}}
				/>

				<TextField className="space-y-1">
					<Label htmlFor="new-event-description" className={LABEL_CLASS}>
						Descripción
					</Label>
					<TextArea
						id="new-event-description"
						value={form.description}
						onChange={(e) => set("description", e.target.value)}
						rows={3}
						className={FIELD_CLASS}
					/>
				</TextField>

				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
					<NumberField
						id="new-event-max-companions"
						minValue={0}
						value={form.maxCompanions}
						onChange={(val) =>
							set("maxCompanions", Number.isNaN(val) ? 0 : val)
						}
						className="space-y-1"
					>
						<Label htmlFor="new-event-max-companions" className={LABEL_CLASS}>
							Acompañantes máximos por invitado
						</Label>
						<NumberField.Input
							id="new-event-max-companions"
							type="number"
							className={FIELD_CLASS}
						/>
					</NumberField>
					<Checkbox
						id="new-event-gift-registry"
						isSelected={form.giftRegistryEnabled}
						onChange={(checked) => set("giftRegistryEnabled", checked)}
						className="flex items-center gap-2 text-sm text-secondary pb-2"
					>
						<Checkbox.Content className="flex items-center gap-2 cursor-pointer">
							<Checkbox.Control className="rounded border-stone-300">
								<Checkbox.Indicator />
							</Checkbox.Control>
							Activar lista de regalos
						</Checkbox.Content>
					</Checkbox>
				</div>

				{error ? (
					<p role="alert" className="text-sm text-red-700">
						{error}
					</p>
				) : null}

				<Button
					type="submit"
					variant="primary"
					isDisabled={submitting}
					isPending={submitting}
				>
					{submitting ? "Creando…" : "Crear evento"}
				</Button>
			</form>
		</section>
	);
}
