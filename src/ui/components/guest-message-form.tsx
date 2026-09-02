"use client";
import { useState } from "react";
import { CheckCircleIcon, MessageSquareIcon } from "./icons";

export type GuestMessageFormProps = {
	onSubmitMessage: (input: { body: string }) => Promise<{ ok: boolean }>;
};

export function GuestMessageForm({ onSubmitMessage }: GuestMessageFormProps) {
	const [body, setBody] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = body.trim();
		if (!trimmed || isSubmitting) return;

		setIsSubmitting(true);
		setErrorMessage(null);

		try {
			const result = await onSubmitMessage({ body: trimmed });
			if (result.ok) {
				setIsSubmitted(true);
				setBody("");
			} else {
				setErrorMessage(
					"No se pudo enviar el mensaje. Por favor, inténtalo de nuevo.",
				);
			}
		} catch {
			setErrorMessage("Error de conexión al enviar el mensaje.");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isSubmitted) {
		return (
			<section
				id="guestbook"
				className="w-full max-w-md mx-auto p-6 bg-champagne-50 rounded-2xl border border-champagne-100 shadow-sm text-center"
			>
				<div className="w-12 h-12 bg-success-bg text-success-green rounded-full flex items-center justify-center mx-auto mb-3">
					<CheckCircleIcon className="w-6 h-6" />
				</div>
				<h3 className="font-serif text-xl text-primary font-semibold mb-1">
					¡Gracias por tus palabras!
				</h3>
				<p className="text-secondary text-sm">
					Tu dedicatoria ha sido guardada para los anfitriones.
				</p>
			</section>
		);
	}

	return (
		<section
			id="guestbook"
			className="w-full max-w-md mx-auto p-6 bg-surface-container-lowest rounded-2xl border border-stone-200 shadow-sm"
		>
			<div className="text-center mb-5">
				<div className="w-10 h-10 bg-champagne-50 text-primary rounded-full flex items-center justify-center mx-auto mb-2 border border-champagne-100">
					<MessageSquareIcon className="w-5 h-5" />
				</div>
				<h3 className="font-serif text-2xl text-primary font-semibold mb-1">
					Dedicatoria
				</h3>
				<p className="text-secondary text-xs">
					Deja un mensaje o felicitación para los anfitriones.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<label htmlFor="guest-message-body" className="sr-only">
						Mensaje para los anfitriones
					</label>
					<textarea
						id="guest-message-body"
						rows={4}
						value={body}
						onChange={(e) => setBody(e.target.value)}
						placeholder="Escribe unas palabras para los anfitriones..."
						className="w-full p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-on-surface placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
					/>
				</div>

				{errorMessage && (
					<p className="text-xs text-error font-medium">{errorMessage}</p>
				)}

				<button
					type="submit"
					disabled={!body.trim() || isSubmitting}
					className="w-full py-3 px-4 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
				>
					{isSubmitting ? (
						<span>Enviando mensaje...</span>
					) : (
						<span>Enviar mensaje</span>
					)}
				</button>
			</form>
		</section>
	);
}
