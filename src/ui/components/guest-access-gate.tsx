"use client";
import { Button, Input, Label, Spinner, TextField } from "@heroui/react";
import { type FormEvent, useState } from "react";
import { ArrowRightIcon, CheckCircleIcon } from "./icons";

export type RequestGuestLinkInput = { contact: string };
export type RequestGuestLinkResult = { ok: true };

export type GuestAccessGateProps = {
	onRequestGuestLink?: (
		input: RequestGuestLinkInput,
	) => Promise<RequestGuestLinkResult>;
};

export const GUEST_ACCESS_CONFIRMATION_MESSAGE =
	"Si estás en la lista, te hemos enviado tu enlace personal al correo que el anfitrión tiene registrado. Si no tienes correo registrado, pídeselo directamente.";

export function GuestAccessGate({ onRequestGuestLink }: GuestAccessGateProps) {
	const [contact, setContact] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [contactError, setContactError] = useState<string | null>(null);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (isSubmitting) return;

		const trimmedContact = contact.trim();
		if (!trimmedContact) {
			setContactError("Por favor, indica tu correo o número telefónico.");
			return;
		}

		setContactError(null);
		setIsSubmitting(true);

		try {
			if (onRequestGuestLink) {
				await onRequestGuestLink({ contact: trimmedContact });
			}
		} catch {
			// Intentionally swallowed: never branch the visible outcome on failure
		} finally {
			setIsSubmitting(false);
			setIsSubmitted(true);
		}
	};

	if (isSubmitted) {
		return (
			<section
				id="rsvp"
				aria-label="Acceso de invitados"
				className="w-full max-w-md mx-auto p-8 bg-[#e8f1fa] rounded-2xl border border-[#d1e4ff] shadow-sm text-center"
			>
				<div className="w-16 h-16 rounded-full bg-success-bg text-success-green mx-auto mb-4 flex items-center justify-center">
					<CheckCircleIcon className="w-8 h-8" />
				</div>
				<h2 className="font-serif text-2xl text-[#2c4d6f] font-semibold mb-2">
					Enlace solicitado
				</h2>
				<p className="text-slate-500 text-sm leading-relaxed">
					{GUEST_ACCESS_CONFIRMATION_MESSAGE}
				</p>
			</section>
		);
	}

	return (
		<section
			id="rsvp"
			aria-label="Acceso de invitados"
			className="w-full max-w-md mx-auto p-6 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-sm"
		>
			<div className="text-center mb-6 sm:mb-8">
				<h2 className="font-serif text-2xl sm:text-3xl text-[#2c4d6f] font-semibold mb-2">
					Acceso al evento
				</h2>
				<p className="text-slate-500 text-sm">
					Para acceder indica tu correo o número telefónico.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-5" noValidate>
				<TextField isInvalid={Boolean(contactError)} className="space-y-1.5">
					<Label
						htmlFor="guest-contact"
						className="block text-sm font-medium text-slate-800"
					>
						Correo o número telefónico{" "}
						<span className="text-error" aria-hidden="true">
							*
						</span>
					</Label>
					<Input
						id="guest-contact"
						name="contact"
						type="text"
						required
						aria-required="true"
						aria-invalid={contactError ? "true" : undefined}
						aria-describedby={
							contactError ? "contact-validation-error" : undefined
						}
						value={contact}
						onChange={(event) => {
							setContact(event.target.value);
							if (contactError) setContactError(null);
						}}
						placeholder="correo@ejemplo.com o 612345678"
						disabled={isSubmitting}
						className="w-full bg-stone-50 border border-slate-300 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2c4d6f] focus:border-[#2c4d6f] transition-all duration-200 placeholder:text-stone-400 disabled:opacity-60"
					/>
					{contactError && (
						<p
							id="contact-validation-error"
							role="alert"
							className="text-xs text-error font-medium"
						>
							{contactError}
						</p>
					)}
				</TextField>

				<div className="pt-2">
					<Button
						type="submit"
						variant="primary"
						fullWidth
						size="lg"
						className="py-4 text-base rounded-2xl shadow-lg shadow-slate-900/15"
						isDisabled={isSubmitting}
						isPending={isSubmitting}
					>
						{isSubmitting ? (
							<>
								<Spinner size="sm" />
								<span>Enviando enlace…</span>
							</>
						) : (
							<>
								<span>Solicitar enlace</span>
								<ArrowRightIcon className="w-4 h-4" />
							</>
						)}
					</Button>
				</div>
			</form>
		</section>
	);
}
