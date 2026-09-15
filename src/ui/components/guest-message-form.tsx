"use client";
import { Alert, Button, Label, TextArea, TextField } from "@heroui/react";
import { useEffect, useState } from "react";
import { CheckCircleIcon, MessageSquareIcon } from "./icons";

export type GuestMessageFormProps = {
	onSubmitMessage: (input: { body: string }) => Promise<{ ok: boolean }>;
	/**
	 * When set, a submitted dedication is remembered in localStorage under this
	 * key so a returning guest sees their own message instead of the form. This
	 * is per-browser by design: clearing storage or opening another browser lets
	 * the guest submit again, an accepted trade-off to stop repeat spam.
	 */
	storageKey?: string;
};

type StoredMessage = { body: string; at: string };

function readStoredMessage(key: string | undefined): string | null {
	if (!key || typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<StoredMessage>;
		return typeof parsed.body === "string" && parsed.body.trim()
			? parsed.body
			: null;
	} catch {
		return null;
	}
}

function persistStoredMessage(key: string | undefined, body: string): void {
	if (!key || typeof window === "undefined") return;
	try {
		const payload: StoredMessage = { body, at: new Date().toISOString() };
		window.localStorage.setItem(key, JSON.stringify(payload));
	} catch {
		// Non-fatal: the message already reached the server.
	}
}

export function GuestMessageForm({
	onSubmitMessage,
	storageKey,
}: GuestMessageFormProps) {
	const [body, setBody] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [submittedBody, setSubmittedBody] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		const stored = readStoredMessage(storageKey);
		if (stored) setSubmittedBody(stored);
	}, [storageKey]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = body.trim();
		if (!trimmed || isSubmitting) return;

		setIsSubmitting(true);
		setErrorMessage(null);

		try {
			const result = await onSubmitMessage({ body: trimmed });
			if (result.ok) {
				persistStoredMessage(storageKey, trimmed);
				setSubmittedBody(trimmed);
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

	if (submittedBody !== null) {
		return (
			<section
				id="guestbook"
				className="w-full p-8 sm:p-10 bg-[#f0f6fc] rounded-3xl border border-[#bcd7f4] shadow-sm text-center"
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
				<blockquote className="text-sm text-slate-700 bg-white border border-[#d1e4ff] rounded-xl p-4 text-left italic whitespace-pre-line">
					{submittedBody}
				</blockquote>
			</section>
		);
	}

	return (
		<section
			id="guestbook"
			data-purpose="guestbook-message"
			className="w-full p-8 sm:p-10 bg-white rounded-3xl border border-slate-200 shadow-sm text-center"
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
				<TextField className="space-y-1">
					<Label htmlFor="guest-message-body" className="sr-only">
						Mensaje para los anfitriones
					</Label>
					<TextArea
						id="guest-message-body"
						rows={4}
						value={body}
						onChange={(e) => setBody(e.target.value)}
						placeholder="Escribe unas palabras para los anfitriones..."
						className="w-full p-4 bg-[#f8fafc] border border-slate-200 rounded-2xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#2c4d6f]/20 focus:border-[#2c4d6f] transition-all resize-none"
					/>
				</TextField>

				{errorMessage && (
					<Alert status="danger" role="alert">
						<Alert.Description>{errorMessage}</Alert.Description>
					</Alert>
				)}

				<Button
					type="submit"
					variant="primary"
					fullWidth
					size="lg"
					className="py-4 text-base rounded-2xl shadow-lg shadow-slate-900/15"
					isDisabled={!body.trim() || isSubmitting}
					isPending={isSubmitting}
				>
					{isSubmitting ? (
						<span>Enviando mensaje...</span>
					) : (
						<span>Enviar mensaje</span>
					)}
				</Button>
			</form>
		</section>
	);
}
