"use client";
import { useState } from "react";
import type { PublicError } from "#/server/contracts/errors";
import type {
	PublicEventPageData,
	RsvpResult,
} from "#/server/contracts/public";
import { CheckCircleIcon, UsersIcon, XCircleIcon } from "./icons";

export type RsvpFormProps = {
	maxCompanions: number;
	rsvpDeadline: string | null;
	guest: PublicEventPageData["guest"];
	onSubmitRsvp: (input: {
		attending: boolean;
		companions: number;
	}) => Promise<RsvpResult>;
};

function formatErrorMessage(error: PublicError): string {
	switch (error.code) {
		case "companion_cap_exceeded":
			return `Número máximo de acompañantes superado (máximo permitido: ${error.maxCompanions}).`;
		case "rsvp_closed":
			return "El plazo de confirmación para este evento ha finalizado.";
		case "invalid_or_expired_link":
			return "El enlace de invitación no es válido o ha expirado.";
		default:
			return "Ha ocurrido un error inesperado al procesar tu confirmación. Inténtalo de nuevo.";
	}
}

export function RsvpForm({
	maxCompanions,
	rsvpDeadline,
	guest,
	onSubmitRsvp,
}: RsvpFormProps) {
	const isClosed = rsvpDeadline ? new Date(rsvpDeadline) < new Date() : false;

	const [attending, setAttending] = useState<boolean | null>(
		guest?.attending ?? null,
	);
	const [companions, setCompanions] = useState<number>(guest?.companions ?? 0);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [storedResult, setStoredResult] = useState<
		Extract<RsvpResult, { ok: true }>["stored"] | null
	>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (attending === null || isSubmitting) return;

		setIsSubmitting(true);
		setErrorMessage(null);

		try {
			const result = await onSubmitRsvp({
				attending,
				companions: attending ? companions : 0,
			});

			if (result.ok) {
				setStoredResult(result.stored);
			} else {
				setStoredResult(null);
				setErrorMessage(formatErrorMessage(result.error));
			}
		} catch {
			setStoredResult(null);
			setErrorMessage("Error de conexión. Por favor, inténtalo de nuevo.");
		} finally {
			setIsSubmitting(false);
		}
	};

	if (isClosed) {
		return (
			<section
				id="rsvp"
				className="w-full max-w-md mx-auto p-6 bg-surface-container-lowest rounded-2xl border border-stone-200 shadow-sm text-center"
			>
				<h2 className="font-serif text-2xl text-primary font-semibold mb-2">
					Confirmaciones cerradas
				</h2>
				<p className="text-secondary text-sm">
					El plazo de confirmación ha finalizado. Si necesitas realizar algún
					cambio, contacta directamente con los anfitriones.
				</p>
			</section>
		);
	}

	if (storedResult) {
		return (
			<section
				id="rsvp"
				className="w-full max-w-md mx-auto p-8 bg-champagne-50 rounded-2xl border border-champagne-100 shadow-sm text-center"
			>
				<div className="w-16 h-16 rounded-full bg-success-bg text-success-green mx-auto mb-4 flex items-center justify-center">
					<CheckCircleIcon className="w-8 h-8" />
				</div>
				<h2 className="font-serif text-2xl text-primary font-semibold mb-2">
					¡Gracias por confirmar!
				</h2>
				{storedResult.attending ? (
					<p className="text-on-surface font-medium mb-1">
						{storedResult.companions > 0
							? `Has confirmado tu asistencia con ${storedResult.companions} ${
									storedResult.companions === 1 ? "acompañante" : "acompañantes"
								}.`
							: "Has confirmado tu asistencia. ¡Nos hace muy felices contar contigo!"}
					</p>
				) : (
					<p className="text-secondary">
						Lamentamos que no puedas acompañarnos en este día tan especial.
					</p>
				)}
				<p className="text-xs text-secondary mt-4">
					Respuesta registrada el{" "}
					{new Date(storedResult.respondedAt).toLocaleDateString()}
				</p>
			</section>
		);
	}

	return (
		<section
			id="rsvp"
			className="w-full max-w-md mx-auto p-6 bg-surface-container-lowest rounded-2xl border border-stone-200 shadow-sm"
		>
			<div className="text-center mb-6">
				<h2 className="font-serif text-3xl text-primary font-semibold mb-1">
					¿Nos acompañas?
				</h2>
				{guest ? (
					<p className="text-on-surface font-medium text-sm">
						Hola, <span className="font-semibold">{guest.displayName}</span>
					</p>
				) : (
					<p className="text-secondary text-sm">
						Por favor, confirma tu asistencia antes de la fecha límite.
					</p>
				)}
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
					<button
						type="button"
						onClick={() => setAttending(true)}
						className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-2 ${
							attending === true
								? "border-primary bg-champagne-50 text-primary ring-2 ring-primary/20"
								: "border-stone-200 hover:border-stone-300 text-on-surface"
						}`}
					>
						<CheckCircleIcon
							className={`w-6 h-6 ${
								attending === true ? "text-success-green" : "text-stone-400"
							}`}
						/>
						<span className="font-semibold text-sm">Asistiré</span>
						<span className="text-xs text-secondary">
							¡Con muchas ganas de celebrar!
						</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setAttending(false);
							setCompanions(0);
						}}
						className={`p-4 rounded-xl border-2 text-center transition-all flex flex-col items-center justify-center gap-2 ${
							attending === false
								? "border-secondary bg-stone-100 text-stone-900 ring-2 ring-stone-300"
								: "border-stone-200 hover:border-stone-300 text-on-surface"
						}`}
					>
						<XCircleIcon
							className={`w-6 h-6 ${
								attending === false ? "text-error" : "text-stone-400"
							}`}
						/>
						<span className="font-semibold text-sm">No podré asistir</span>
						<span className="text-xs text-secondary">
							Estaré presente en espíritu
						</span>
					</button>
				</div>

				{attending === true && maxCompanions > 0 && (
					<div className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<UsersIcon className="w-5 h-5 text-primary" />
								<span className="text-sm font-medium text-on-surface">
									Acompañantes
								</span>
							</div>
							<div className="flex items-center gap-3">
								<button
									type="button"
									aria-label="Reducir acompañantes"
									disabled={companions <= 0}
									onClick={() => setCompanions((c) => Math.max(0, c - 1))}
									className="w-8 h-8 rounded-full border border-stone-300 bg-white flex items-center justify-center text-sm font-bold text-on-surface disabled:opacity-30 hover:bg-stone-100"
								>
									-
								</button>
								<span className="font-semibold text-base w-4 text-center">
									{companions}
								</span>
								<button
									type="button"
									aria-label="Incrementar acompañantes"
									disabled={companions >= maxCompanions}
									onClick={() =>
										setCompanions((c) => Math.min(maxCompanions, c + 1))
									}
									className="w-8 h-8 rounded-full border border-stone-300 bg-white flex items-center justify-center text-sm font-bold text-on-surface disabled:opacity-30 hover:bg-stone-100"
								>
									+
								</button>
							</div>
						</div>
						<p className="text-xs text-secondary text-right">
							Máximo permitido: {maxCompanions}
						</p>
					</div>
				)}

				{errorMessage && (
					<div className="p-3 bg-error-container text-error rounded-xl text-xs font-medium">
						{errorMessage}
					</div>
				)}

				<button
					type="submit"
					disabled={attending === null || isSubmitting}
					className="w-full py-3.5 px-4 bg-primary text-white rounded-xl font-medium text-sm hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center justify-center gap-2"
				>
					{isSubmitting ? (
						<span>Enviando...</span>
					) : (
						<span>Confirmar respuesta</span>
					)}
				</button>
			</form>
		</section>
	);
}
