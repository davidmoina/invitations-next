"use client";

import { useRef, useState } from "react";
import type { AdminMedia } from "#/server/contracts/admin";
import { FIELD_CLASS, LABEL_CLASS } from "./event-form-fields";

export type MediaPanelProps = {
	media: AdminMedia[];
	onAddMedia?: (input: {
		file: File;
		alt: string;
		position: number;
	}) => Promise<AdminMedia>;
	onRemoveMedia?: (mediaId: string) => Promise<{ mediaId: string }>;
	onSetCoverMedia?: (mediaId: string) => Promise<{ media: AdminMedia[] }>;
	onRefresh?: () => Promise<void> | void;
};

export function MediaPanel({
	media,
	onAddMedia,
	onRemoveMedia,
	onSetCoverMedia,
	onRefresh,
}: MediaPanelProps) {
	const [items, setItems] = useState<AdminMedia[]>(media);
	const [prevMedia, setPrevMedia] = useState<AdminMedia[]>(media);
	if (media !== prevMedia) {
		setPrevMedia(media);
		setItems(media);
	}

	const [file, setFile] = useState<File | null>(null);
	const [alt, setAlt] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleUpload = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submitting) return;

		if (!file) {
			setError("Selecciona una imagen para subir.");
			return;
		}
		const trimmedAlt = alt.trim();
		if (trimmedAlt === "") {
			setError("Añade un texto alternativo a la imagen.");
			return;
		}
		if (!onAddMedia) return;

		setSubmitting(true);
		setError(null);

		try {
			const result = await onAddMedia({
				file,
				alt: trimmedAlt,
				position: items.length,
			});
			setItems((current) => [...current, result]);
			setFile(null);
			setAlt("");
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
			await onRefresh?.();
		} catch {
			setError("No se ha podido subir la imagen. Inténtalo de nuevo.");
		} finally {
			setSubmitting(false);
		}
	};

	const handleSetCover = async (mediaId: string) => {
		if (submitting) return;
		if (!onSetCoverMedia) return;
		setSubmitting(true);
		setError(null);

		try {
			const result = await onSetCoverMedia(mediaId);
			setItems(result.media);
			await onRefresh?.();
		} catch {
			setError("No se ha podido cambiar la foto de portada.");
		} finally {
			setSubmitting(false);
		}
	};

	const handleRemove = async (mediaId: string) => {
		if (submitting) return;
		if (!onRemoveMedia) return;
		setSubmitting(true);
		setError(null);

		try {
			await onRemoveMedia(mediaId);
			setItems((current) => current.filter((item) => item.id !== mediaId));
			await onRefresh?.();
		} catch {
			setError("No se ha podido eliminar la imagen.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<section
			aria-label="Fotos del evento"
			className="p-6 bg-surface rounded-2xl border border-stone-200/80 shadow-2xs space-y-4"
		>
			<h2 className="font-serif italic text-2xl font-bold text-primary">
				Fotos del evento
			</h2>

			{items.length === 0 ? (
				<p className="text-sm text-secondary">Todavía no hay fotos.</p>
			) : (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
					{items.map((item) => (
						<div
							key={item.id}
							className="group relative flex flex-col rounded-xl overflow-hidden border border-stone-200 bg-stone-50"
						>
							<div className="relative aspect-square w-full overflow-hidden bg-stone-100">
								{/* biome-ignore lint/performance/noImgElement: standard image preview */}
								<img
									src={item.urls.thumb}
									alt={item.alt || "Foto del evento"}
									className="w-full h-full object-cover"
								/>
								{item.isCover && (
									<span className="absolute top-2 left-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-champagne-100 text-champagne-800 border border-champagne-200/60 shadow-2xs">
										Portada
									</span>
								)}
							</div>
							<div className="p-2 space-y-1.5 flex flex-col">
								{item.alt ? (
									<p className="text-xs text-secondary truncate font-medium">
										{item.alt}
									</p>
								) : null}
								<div className="flex flex-wrap gap-1.5 pt-1">
									<button
										type="button"
										onClick={() => handleSetCover(item.id)}
										disabled={item.isCover || submitting}
										className="text-xs font-medium px-2.5 py-1 rounded-lg border border-stone-300 text-on-surface hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
									>
										Usar como portada
									</button>
									<button
										type="button"
										onClick={() => handleRemove(item.id)}
										disabled={submitting}
										className="text-xs font-medium px-2.5 py-1 rounded-lg border border-stone-300 text-error hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
									>
										Eliminar
									</button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			<form
				onSubmit={handleUpload}
				className="pt-4 border-t border-stone-200/80 space-y-3"
			>
				<h3 className="text-sm font-semibold text-primary">Subir foto</h3>
				<div>
					<label htmlFor="media-file" className={LABEL_CLASS}>
						Imagen
					</label>
					<input
						ref={fileInputRef}
						id="media-file"
						type="file"
						accept="image/*"
						onChange={(e) => setFile(e.target.files?.[0] ?? null)}
						className={FIELD_CLASS}
						disabled={submitting}
					/>
				</div>

				<div>
					<label htmlFor="media-alt" className={LABEL_CLASS}>
						Texto alternativo
					</label>
					<input
						id="media-alt"
						type="text"
						value={alt}
						onChange={(e) => setAlt(e.target.value)}
						placeholder="Descripción de la imagen"
						className={FIELD_CLASS}
						disabled={submitting}
					/>
				</div>

				{error ? (
					<p role="alert" className="text-sm text-red-700 font-medium">
						{error}
					</p>
				) : null}

				<div className="pt-2">
					<button
						type="submit"
						disabled={submitting}
						className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
					>
						{submitting ? "Subiendo…" : "Subir imagen"}
					</button>
				</div>
			</form>
		</section>
	);
}
