"use client";

import { type FormEvent, useState } from "react";
import type {
	PublicEventPreview as PublicEventPreviewData,
	PublicEventPreviewProps,
	RequestGuestLinkInput,
	RequestGuestLinkResult,
} from "#/server/contracts/public";
import { GUEST_ACCESS_CONFIRMATION_MESSAGE } from "./components/guest-access-gate";
import {
	ArrowRightIcon,
	CheckCircleIcon,
	SpinnerIcon,
} from "./components/icons";

export { GUEST_ACCESS_CONFIRMATION_MESSAGE };
export type {
	PublicEventPreviewProps,
	RequestGuestLinkInput,
	RequestGuestLinkResult,
};

export function formatInviterHeadline(
	event: Pick<PublicEventPreviewData, "honoreeNames" | "title">,
): string {
	const validHonorees = (event.honoreeNames ?? [])
		.map((name) => name?.trim())
		.filter((name): name is string => Boolean(name && name.length > 0));

	if (validHonorees.length > 0) {
		const formatted =
			typeof Intl !== "undefined" && Intl.ListFormat
				? new Intl.ListFormat("es", {
						style: "long",
						type: "conjunction",
					}).format(validHonorees)
				: validHonorees.length === 1
					? validHonorees[0]
					: validHonorees.length === 2
						? `${validHonorees[0]} y ${validHonorees[1]}`
						: `${validHonorees.slice(0, -1).join(", ")} y ${validHonorees[validHonorees.length - 1]}`;

		return `Has recibido una invitación de ${formatted}`;
	}

	return `Has recibido una invitación de ${event.title.trim()}`;
}

export function PublicEventPreview({
	event,
	onRequestGuestLink,
}: PublicEventPreviewProps) {
	const [contact, setContact] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [contactError, setContactError] = useState<string | null>(null);

	const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
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
			<div className="min-h-screen bg-stone-50 text-on-surface font-sans antialiased flex items-center justify-center p-4 sm:p-6 selection:bg-primary-container/40 selection:text-primary">
				<main
					aria-label="Acceso de invitados"
					className="w-full max-w-md mx-auto p-8 bg-champagne-50 rounded-2xl sm:rounded-3xl border border-champagne-100 shadow-sm text-center"
				>
					<div className="w-16 h-16 rounded-full bg-success-bg text-success-green mx-auto mb-4 flex items-center justify-center">
						<CheckCircleIcon className="w-8 h-8" />
					</div>
					<h1 className="font-serif text-2xl text-primary font-semibold mb-2">
						Enlace solicitado
					</h1>
					<p className="text-secondary text-sm leading-relaxed">
						{GUEST_ACCESS_CONFIRMATION_MESSAGE}
					</p>
				</main>
			</div>
		);
	}

	const headline = formatInviterHeadline(event);

	return (
		<div className="min-h-screen bg-stone-50 text-on-surface font-sans antialiased flex items-center justify-center p-4 sm:p-6 selection:bg-primary-container/40 selection:text-primary">
			<main
				aria-label="Acceso de invitados"
				className="w-full max-w-md mx-auto bg-surface p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-sm"
			>
				<div className="text-center mb-6 sm:mb-8">
					<p className="text-xs uppercase tracking-[0.2em] text-champagne-700 font-medium mb-3">
						Invitación
					</p>
					<h1 className="font-serif text-2xl sm:text-3xl text-primary font-semibold tracking-tight mb-2">
						{headline}
					</h1>
					<p className="text-secondary text-sm">
						Introduce tus datos para continuar.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5" noValidate>
					<div className="space-y-1.5">
						<label
							htmlFor="guest-contact"
							className="block text-sm font-medium text-on-surface"
						>
							Correo o número telefónico{" "}
							<span className="text-error" aria-hidden="true">
								*
							</span>
						</label>
						<input
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
							className="w-full bg-stone-50 border border-stone-300 text-on-surface rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 placeholder:text-stone-400 disabled:opacity-60"
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
					</div>

					<div className="pt-2">
						<button
							type="submit"
							disabled={isSubmitting}
							className="w-full bg-primary text-white font-medium text-sm py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
						>
							{isSubmitting ? (
								<>
									<SpinnerIcon className="w-4 h-4 animate-spin" />
									<span>Enviando enlace…</span>
								</>
							) : (
								<>
									<span>Solicitar enlace</span>
									<ArrowRightIcon className="w-4 h-4" />
								</>
							)}
						</button>
					</div>
				</form>
			</main>
		</div>
	);
}

export default PublicEventPreview;
