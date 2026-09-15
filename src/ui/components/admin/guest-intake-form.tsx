"use client";
import { Alert, Button, Input, Label, TextField } from "@heroui/react";
import { useState } from "react";

import { FIELD_CLASS, LABEL_CLASS, orNull } from "./event-form-fields";

export type GuestIntakeInput = {
	displayName: string;
	email: string | null;
	phone: string | null;
};

export type GuestIntakeFormProps = {
	onAddGuests: (guests: GuestIntakeInput[]) => Promise<unknown>;
	onSuccess?: (addedAnother: boolean) => void;
	showHeader?: boolean;
};

const ADD_INTENT = "add";
const ADD_ANOTHER_INTENT = "add-another";

/** Manual one-at-a-time intake deliberately excludes CSV import. */
export function GuestIntakeForm({
	onAddGuests,
	onSuccess,
	showHeader = true,
}: GuestIntakeFormProps) {
	const [displayName, setDisplayName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [successNotice, setSuccessNotice] = useState<string | null>(null);
	const [isAnother, setIsAnother] = useState(false);

	const addGuest = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (submitting) return;
		// Read the intent from the submitter: a state set in the button's onClick
		// is not yet applied when the browser dispatches the submit event.
		const submitter = (event.nativeEvent as SubmitEvent).submitter;
		const another =
			submitter instanceof HTMLButtonElement &&
			submitter.value === ADD_ANOTHER_INTENT;
		setIsAnother(another);
		const name = displayName.trim();
		if (name === "") {
			setError("Indica el nombre del invitado.");
			return;
		}

		setSubmitting(true);
		setError(null);
		setSuccessNotice(null);
		try {
			await onAddGuests([
				{
					displayName: name,
					email: orNull(email),
					phone: orNull(phone),
				},
			]);
			setDisplayName("");
			setEmail("");
			setPhone("");
			if (another) {
				setSuccessNotice(`«${name}» añadido con éxito. Puedes añadir otro.`);
			}
			onSuccess?.(another);
		} catch {
			setError("No hemos podido añadir el invitado. Inténtalo de nuevo.");
		} finally {
			setSubmitting(false);
		}
	};

	const formContent = (
		<form onSubmit={addGuest} className="space-y-3">
			{successNotice && (
				<Alert status="success" role="status">
					<Alert.Description>{successNotice}</Alert.Description>
				</Alert>
			)}

			<TextField className="space-y-1">
				<Label htmlFor="guest-display-name" className={LABEL_CLASS}>
					Nombre
				</Label>
				<Input
					id="guest-display-name"
					value={displayName}
					onChange={(event) => setDisplayName(event.target.value)}
					placeholder="Ej. María García"
					className={FIELD_CLASS}
				/>
			</TextField>

			<TextField className="space-y-1">
				<Label htmlFor="guest-email" className={LABEL_CLASS}>
					Email
				</Label>
				<Input
					id="guest-email"
					type="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					placeholder="maria@example.com"
					className={FIELD_CLASS}
				/>
			</TextField>

			<TextField className="space-y-1">
				<Label htmlFor="guest-phone" className={LABEL_CLASS}>
					Teléfono
				</Label>
				<Input
					id="guest-phone"
					type="tel"
					value={phone}
					onChange={(event) => setPhone(event.target.value)}
					placeholder="+34 600 123 456"
					className={FIELD_CLASS}
				/>
			</TextField>

			{error ? (
				<Alert status="danger" role="alert">
					<Alert.Description>{error}</Alert.Description>
				</Alert>
			) : null}

			<div className="flex flex-wrap items-center gap-3 pt-2">
				<Button
					type="submit"
					name="intent"
					value={ADD_INTENT}
					variant="primary"
					isDisabled={submitting}
					isPending={submitting && !isAnother}
				>
					{submitting && !isAnother ? "Añadiendo…" : "Añadir invitado"}
				</Button>
				<Button
					type="submit"
					name="intent"
					value={ADD_ANOTHER_INTENT}
					variant="secondary"
					isDisabled={submitting}
					isPending={submitting && isAnother}
				>
					{submitting && isAnother ? "Añadiendo…" : "Guardar y añadir otro"}
				</Button>
			</div>
		</form>
	);

	if (!showHeader) {
		return formContent;
	}

	return (
		<section
			aria-label="Añadir invitados"
			className="px-4 py-6 border-t border-stone-200/80"
		>
			<h2 className="font-serif text-xl text-primary font-semibold mb-4">
				Añadir invitados
			</h2>
			{formContent}
		</section>
	);
}
