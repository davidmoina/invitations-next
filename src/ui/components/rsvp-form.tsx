"use client";
import { Button } from "@heroui/react";
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
	const hasExistingResponse = guest?.attending != null;

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
				className="w-full p-8 sm:p-10 bg-white rounded-3xl border border-slate-200 shadow-sm text-center"
			>
				<h2 className="font-serif text-2xl text-[#2c4d6f] font-semibold mb-2">
					Confirmaciones cerradas
				</h2>
				<p className="text-slate-500 text-sm">
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
				className="w-full p-8 sm:p-10 bg-[#f0f6fc] rounded-3xl border border-[#bcd7f4] shadow-sm text-center"
			>
				<div className="w-14 h-14 rounded-full bg-[#d1e4ff] text-[#113657] mx-auto mb-4 flex items-center justify-center border border-sky-200">
					<CheckCircleIcon className="w-7 h-7" />
				</div>
				<h2 className="font-serif text-2xl text-[#1c4167] font-semibold mb-2">
					¡Gracias por confirmar!
				</h2>
				{storedResult.attending ? (
					<p className="text-slate-700 font-medium mb-1">
						{storedResult.companions > 0
							? `Has confirmado tu asistencia con ${storedResult.companions} ${
									storedResult.companions === 1 ? "acompañante" : "acompañantes"
								}.`
							: "Has confirmado tu asistencia. ¡Nos hace muy felices contar contigo!"}
					</p>
				) : (
					<p className="text-slate-500">
						Lamentamos que no puedas acompañarnos en este día tan especial.
					</p>
				)}
				<p className="text-xs text-slate-400 mt-4">
					Respuesta registrada el{" "}
					{new Date(storedResult.respondedAt).toLocaleDateString()}
				</p>
			</section>
		);
	}

	return (
		<section
			id="rsvp"
			data-purpose="rsvp-module"
			className="w-full p-8 sm:p-10 bg-white rounded-3xl border border-slate-200 shadow-sm text-center"
		>
			<div className="max-w-md mx-auto mb-8">
				<h2 className="font-serif text-3xl sm:text-4xl font-bold text-slate-800">
					¿Nos acompañas?
				</h2>
				{guest ? (
					<p className="text-slate-500 font-medium text-sm mt-1">
						Hola,{" "}
						<span className="capitalize text-slate-800 font-semibold">
							{guest.displayName}
						</span>
					</p>
				) : (
					<p className="text-slate-500 text-sm mt-1">
						Por favor, confirma tu asistencia antes de la fecha límite.
					</p>
				)}
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
					<button
						type="button"
						onClick={() => setAttending(true)}
						className={`p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center text-center h-full ${
							attending === true
								? "border-[#2c4d6f] bg-[#f0f6fc] shadow-sm ring-2 ring-[#2c4d6f]/20"
								: "border-slate-200 hover:border-[#2c4d6f]/40 bg-[#f8fafc]"
						}`}
					>
						<div className="w-11 h-11 rounded-full bg-[#d1e4ff] text-[#113657] flex items-center justify-center mb-3 border border-sky-200">
							<CheckCircleIcon className="w-6 h-6" />
						</div>
						<span className="font-semibold text-slate-800 text-base mb-1">
							Asistiré
						</span>
						<span className="text-xs text-slate-500 leading-snug">
							¡Con muchas ganas de celebrar!
						</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setAttending(false);
							setCompanions(0);
						}}
						className={`p-5 rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center text-center h-full ${
							attending === false
								? "border-[#2c4d6f] bg-[#f0f6fc] shadow-sm ring-2 ring-[#2c4d6f]/20"
								: "border-slate-200 hover:border-[#2c4d6f]/40 bg-[#f8fafc]"
						}`}
					>
						<div className="w-11 h-11 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-3 border border-slate-200">
							<XCircleIcon className="w-6 h-6" />
						</div>
						<span className="font-semibold text-slate-800 text-base mb-1">
							No podré asistir
						</span>
						<span className="text-xs text-slate-500 leading-snug">
							Estaré presente en espíritu
						</span>
					</button>
				</div>

				{attending === true && maxCompanions > 0 && (
					<div className="p-4 bg-[#f8fafc] rounded-2xl border border-slate-200 space-y-2">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<UsersIcon className="w-5 h-5 text-[#2c4d6f]" />
								<span className="text-sm font-medium text-slate-800">
									Acompañantes
								</span>
							</div>
							<div className="flex items-center gap-3">
								<Button
									type="button"
									aria-label="Reducir acompañantes"
									variant="outline"
									size="sm"
									isIconOnly
									isDisabled={companions <= 0}
									onPress={() => setCompanions((c) => Math.max(0, c - 1))}
								>
									-
								</Button>
								<span className="font-semibold text-base w-4 text-center text-slate-800">
									{companions}
								</span>
								<Button
									type="button"
									aria-label="Incrementar acompañantes"
									variant="outline"
									size="sm"
									isIconOnly
									isDisabled={companions >= maxCompanions}
									onPress={() =>
										setCompanions((c) => Math.min(maxCompanions, c + 1))
									}
								>
									+
								</Button>
							</div>
						</div>
						<p className="text-xs text-slate-500 text-right">
							Máximo permitido: {maxCompanions}
						</p>
					</div>
				)}

				{errorMessage && (
					<div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-medium border border-red-200">
						{errorMessage}
					</div>
				)}

				<Button
					type="submit"
					variant="primary"
					fullWidth
					isDisabled={attending === null || isSubmitting}
					isPending={isSubmitting}
				>
					{isSubmitting ? (
						<span>
							{hasExistingResponse ? "Actualizando..." : "Enviando..."}
						</span>
					) : (
						<span>
							{hasExistingResponse
								? "Actualizar respuesta"
								: "Confirmar respuesta"}
						</span>
					)}
				</Button>
			</form>
		</section>
	);
}
