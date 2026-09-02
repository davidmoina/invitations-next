"use client";
import { useState } from "react";

import { FIELD_CLASS, LABEL_CLASS, orNull } from "./event-form-fields";

export type GiftFormInput = {
	title: string;
	description: string | null;
	url: string | null;
	imagePublicId: string | null;
	position: number;
};

export type GiftFormProps = {
	onCreateGift: (input: GiftFormInput) => Promise<{ id: string }>;
};

export function GiftForm({ onCreateGift }: GiftFormProps) {
	const [form, setForm] = useState({
		title: "",
		description: "",
		url: "",
		imagePublicId: "",
		position: 0,
	});
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
		setForm((current) => ({ ...current, [key]: value }));

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		if (submitting) return;
		const title = form.title.trim();
		if (title === "") {
			setError("Pon un título al regalo.");
			return;
		}

		setSubmitting(true);
		setError(null);
		try {
			await onCreateGift({
				title,
				description: orNull(form.description),
				url: orNull(form.url),
				imagePublicId: orNull(form.imagePublicId),
				position: form.position,
			});
			setForm({
				title: "",
				description: "",
				url: "",
				imagePublicId: "",
				position: 0,
			});
		} catch {
			setError("No hemos podido añadir el regalo. Inténtalo de nuevo.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<section
			aria-label="Añadir regalo"
			className="px-4 py-6 border-t border-stone-200/80"
		>
			<h2 className="font-serif text-xl text-primary font-semibold mb-4">
				Añadir regalo
			</h2>
			<form onSubmit={handleSubmit} className="space-y-3">
				<label htmlFor="gift-title" className={LABEL_CLASS}>
					Título
				</label>
				<input
					id="gift-title"
					value={form.title}
					onChange={(event) => set("title", event.target.value)}
					className={FIELD_CLASS}
				/>

				<label htmlFor="gift-description" className={LABEL_CLASS}>
					Descripción
				</label>
				<textarea
					id="gift-description"
					value={form.description}
					onChange={(event) => set("description", event.target.value)}
					className={FIELD_CLASS}
				/>

				<label htmlFor="gift-url" className={LABEL_CLASS}>
					Enlace
				</label>
				<input
					id="gift-url"
					type="url"
					value={form.url}
					onChange={(event) => set("url", event.target.value)}
					className={FIELD_CLASS}
				/>

				<label htmlFor="gift-image" className={LABEL_CLASS}>
					Imagen
				</label>
				<input
					id="gift-image"
					value={form.imagePublicId}
					onChange={(event) => set("imagePublicId", event.target.value)}
					className={FIELD_CLASS}
				/>

				<label htmlFor="gift-position" className={LABEL_CLASS}>
					Posición
				</label>
				<input
					id="gift-position"
					type="number"
					min={0}
					value={form.position}
					onChange={(event) => set("position", Number(event.target.value) || 0)}
					className={FIELD_CLASS}
				/>

				{error ? (
					<p role="alert" className="text-sm text-red-700">
						{error}
					</p>
				) : null}
				<button type="submit" disabled={submitting}>
					{submitting ? "Añadiendo…" : "Añadir regalo"}
				</button>
			</form>
		</section>
	);
}
