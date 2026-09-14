"use client";
import {
	Alert,
	Button,
	Input,
	Label,
	NumberField,
	TextArea,
	TextField,
} from "@heroui/react";
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
	onSuccess?: () => void;
	showHeader?: boolean;
};

export function GiftForm({
	onCreateGift,
	onSuccess,
	showHeader = true,
}: GiftFormProps) {
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
			onSuccess?.();
		} catch {
			setError("No hemos podido añadir el regalo. Inténtalo de nuevo.");
		} finally {
			setSubmitting(false);
		}
	};

	const formContent = (
		<form onSubmit={handleSubmit} className="space-y-3">
			<TextField className="space-y-1">
				<Label htmlFor="gift-title" className={LABEL_CLASS}>
					Título
				</Label>
				<Input
					id="gift-title"
					value={form.title}
					onChange={(event) => set("title", event.target.value)}
					className={FIELD_CLASS}
				/>
			</TextField>

			<TextField className="space-y-1">
				<Label htmlFor="gift-description" className={LABEL_CLASS}>
					Descripción
				</Label>
				<TextArea
					id="gift-description"
					value={form.description}
					onChange={(event) => set("description", event.target.value)}
					className={FIELD_CLASS}
				/>
			</TextField>

			<TextField className="space-y-1">
				<Label htmlFor="gift-url" className={LABEL_CLASS}>
					Enlace
				</Label>
				<Input
					id="gift-url"
					type="url"
					value={form.url}
					onChange={(event) => set("url", event.target.value)}
					className={FIELD_CLASS}
				/>
			</TextField>

			<TextField className="space-y-1">
				<Label htmlFor="gift-image" className={LABEL_CLASS}>
					Imagen
				</Label>
				<Input
					id="gift-image"
					value={form.imagePublicId}
					onChange={(event) => set("imagePublicId", event.target.value)}
					className={FIELD_CLASS}
				/>
			</TextField>

			<NumberField
				id="gift-position"
				minValue={0}
				value={form.position}
				onChange={(val) => set("position", Number.isNaN(val) ? 0 : val)}
				className="space-y-1"
			>
				<Label htmlFor="gift-position" className={LABEL_CLASS}>
					Posición
				</Label>
				<NumberField.Input
					id="gift-position"
					type="number"
					className={FIELD_CLASS}
				/>
			</NumberField>

			{error ? (
				<Alert status="danger" role="alert">
					<Alert.Description>{error}</Alert.Description>
				</Alert>
			) : null}
			<div className="pt-2">
				<Button
					type="submit"
					variant="primary"
					isDisabled={submitting}
					isPending={submitting}
				>
					{submitting ? "Añadiendo…" : "Añadir regalo"}
				</Button>
			</div>
		</form>
	);

	if (!showHeader) {
		return formContent;
	}

	return (
		<section
			aria-label="Añadir regalo"
			className="px-4 py-6 border-t border-stone-200/80"
		>
			<h2 className="font-serif text-xl text-primary font-semibold mb-4">
				Añadir regalo
			</h2>
			{formContent}
		</section>
	);
}
