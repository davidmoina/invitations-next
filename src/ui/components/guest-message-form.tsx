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
				className="w-full max-w-xl mx-auto p-8 sm:p-10 bg-[#f0f6fc] rounded-3xl border border-[#bcd7f4] shadow-sm text-center"
			>
				<div className="w-14 h-14 bg-[#d1e4ff] text-[#113657] rounded-full flex items-center justify-center mx-auto mb-3 border border-sky-200">
					<CheckCircleIcon className="w-7 h-7" />
				</div>
				<h3 className="font-serif text-2xl text-[#1c4167] font-semibold mb-1">
					¡Gracias por tus palabras!
				</h3>
				<p className="text-slate-500 text-sm">
					Tu dedicatoria ha sido guardada para los anfitriones.
				</p>
			</section>
		);
	}

	return (
		<section
			id="guestbook"
			data-purpose="guestbook-message"
			className="w-full max-w-xl mx-auto p-8 sm:p-10 bg-white rounded-3xl border border-slate-200 shadow-sm text-center"
		>
			<div className="max-w-xl mx-auto text-center mb-6">
				<div className="w-14 h-14 rounded-full bg-[#e8f1fa] text-[#274b70] mx-auto flex items-center justify-center mb-4 shadow-sm border border-[#d1e4ff]">
					<MessageSquareIcon className="w-7 h-7" />
				</div>
				<h3 className="font-serif text-3xl sm:text-4xl font-bold text-slate-800 mb-1">
					Dedicatoria
				</h3>
				<p className="text-slate-500 text-sm">
					Deja un mensaje o felicitación para los anfitriones.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-4 text-left">
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
						className="w-full p-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2c4d6f]/20 focus:border-[#2c4d6f] transition-all resize-none"
					/>
				</div>

				{errorMessage && (
					<p className="text-xs text-red-600 font-medium">{errorMessage}</p>
				)}

				<button
					type="submit"
					disabled={!body.trim() || isSubmitting}
					className="w-full py-3.5 px-6 rounded-2xl bg-[#d9e4f0] text-[#121d25] hover:bg-[#2c4d6f] hover:text-white font-medium text-sm transition-all duration-300 shadow-sm active:scale-[0.99] border border-slate-200/80 hover:border-transparent disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
