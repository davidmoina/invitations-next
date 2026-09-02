"use client";
import { useState } from "react";

import { FIELD_CLASS, LABEL_CLASS, orNull } from "./event-form-fields";

export type GuestIntakeInput = { displayName: string; email: string | null };

export type GuestIntakeFormProps = {
	onAddGuests: (guests: GuestIntakeInput[]) => Promise<unknown>;
};

/** Manual one-at-a-time intake deliberately excludes CSV import. */
export function GuestIntakeForm({ onAddGuests }: GuestIntakeFormProps) {
	const [displayName, setDisplayName] = useState("");
	const [email, setEmail] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const addGuest = async (event: React.FormEvent) => {
		event.preventDefault();
		if (submitting) return;
		const name = displayName.trim();
		if (name === "") {
			setError("Indica el nombre del invitado.");
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			await onAddGuests([{ displayName: name, email: orNull(email) }]);
			setDisplayName("");
			setEmail("");
		} catch {
			setError("No hemos podido añadir el invitado. Inténtalo de nuevo.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<section
			aria-label="Añadir invitados"
			className="px-4 py-6 border-t border-stone-200/80"
		>
			<h2 className="font-serif text-xl text-primary font-semibold mb-4">
				Añadir invitados
			</h2>
			<form onSubmit={addGuest} className="space-y-3">
				<label htmlFor="guest-display-name" className={LABEL_CLASS}>
					Nombre
				</label>
				<input
					id="guest-display-name"
					value={displayName}
					onChange={(event) => setDisplayName(event.target.value)}
					className={FIELD_CLASS}
				/>

				<label htmlFor="guest-email" className={LABEL_CLASS}>
					Email
				</label>
				<input
					id="guest-email"
					type="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					className={FIELD_CLASS}
				/>

				{error ? (
					<p role="alert" className="text-sm text-red-700">
						{error}
					</p>
				) : null}
				<button type="submit" disabled={submitting}>
					{submitting ? "Añadiendo…" : "Añadir invitado"}
				</button>
				<button type="submit" disabled={submitting}>
					Añadir y otro
				</button>
			</form>
		</section>
	);
}
