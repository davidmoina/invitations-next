"use client";

import { Alert, Button } from "@heroui/react";
import { useEffect, useRef, useState } from "react";
import type { AdminMedia } from "#/server/contracts/admin";
import { ImageIcon, UploadCloudIcon } from "../icons";
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
	const [previewUrl, setPreviewUrl] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [alt, setAlt] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (!file) {
			setPreviewUrl(null);
			return;
		}
		let objectUrl: string | null = null;
		if (
			typeof URL !== "undefined" &&
			typeof URL.createObjectURL === "function"
		) {
			objectUrl = URL.createObjectURL(file);
			setPreviewUrl(objectUrl);
		}
		return () => {
			if (
				objectUrl &&
				typeof URL !== "undefined" &&
				typeof URL.revokeObjectURL === "function"
			) {
				URL.revokeObjectURL(objectUrl);
			}
		};
	}, [file]);

	const handleDragEnter = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
		const dropped = e.dataTransfer.files?.[0];
		if (!dropped) return;
		if (!dropped.type.startsWith("image/")) {
			setError("Por favor, selecciona un archivo de imagen (JPG, PNG, WEBP).");
			return;
		}
		setFile(dropped);
		setError(null);
	};

	const handleClearFile = (e?: unknown) => {
		if (
			e &&
			typeof (e as { stopPropagation?: unknown }).stopPropagation === "function"
		) {
			(e as { stopPropagation: () => void }).stopPropagation();
		}
		setFile(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

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
									<Button
										type="button"
										variant="outline"
										size="sm"
										onPress={() => handleSetCover(item.id)}
										isDisabled={item.isCover || submitting}
									>
										Usar como portada
									</Button>
									<Button
										type="button"
										variant="danger"
										size="sm"
										onPress={() => handleRemove(item.id)}
										isDisabled={submitting}
									>
										Eliminar
									</Button>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			<form
				onSubmit={handleUpload}
				className="pt-6 border-t border-stone-200/80 space-y-4"
			>
				<div>
					<h3 className="text-base font-semibold text-primary">Subir foto</h3>
					<p className="text-xs text-secondary mt-0.5">
						Añade fotografías a la galería del evento.
					</p>
				</div>

				<div>
					<label
						htmlFor="media-file"
						onDragEnter={handleDragEnter}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						className="block space-y-1 cursor-pointer"
					>
						<span className={LABEL_CLASS}>Imagen</span>
						<div
							className={`relative flex flex-col items-center justify-center p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all duration-200 text-center focus-within:ring-2 focus-within:ring-primary ${
								isDragging
									? "border-champagne-500 bg-champagne-50/80 ring-4 ring-champagne-200/50 scale-[1.01]"
									: file
										? "border-champagne-300 bg-champagne-50/30 hover:bg-champagne-50/50"
										: "border-stone-300 bg-stone-50/60 hover:bg-stone-50 hover:border-champagne-400"
							}`}
						>
							<input
								ref={fileInputRef}
								id="media-file"
								type="file"
								accept="image/*"
								onChange={(e) => {
									const selected = e.target.files?.[0] ?? null;
									setFile(selected);
									if (selected) setError(null);
								}}
								className="sr-only"
								disabled={submitting}
							/>

							{file ? (
								<div className="flex flex-col sm:flex-row items-center gap-4 w-full max-w-md">
									{previewUrl ? (
										<div className="relative w-20 h-20 rounded-xl overflow-hidden border border-stone-200 shadow-2xs shrink-0 bg-stone-100">
											{/* biome-ignore lint/performance/noImgElement: local upload preview */}
											<img
												src={previewUrl}
												alt="Vista previa"
												className="w-full h-full object-cover"
											/>
										</div>
									) : (
										<div className="w-16 h-16 rounded-xl bg-champagne-100 text-champagne-700 flex items-center justify-center shrink-0">
											<ImageIcon className="w-8 h-8" />
										</div>
									)}
									<div className="flex-1 min-w-0 text-center sm:text-left">
										<p className="text-sm font-semibold text-primary truncate">
											{file.name}
										</p>
										<p className="text-xs text-secondary mt-0.5">
											{(file.size / (1024 * 1024)).toFixed(2)} MB
										</p>
										<div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
											<span className="text-xs text-champagne-700 font-medium hover:underline">
												Cambiar foto
											</span>
											<span className="text-stone-300">·</span>
											<Button
												type="button"
												variant="ghost"
												size="sm"
												onPress={() => handleClearFile()}
												className="text-xs text-error font-medium hover:underline p-0 h-auto"
											>
												Quitar
											</Button>
										</div>
									</div>
								</div>
							) : (
								<div className="flex flex-col items-center gap-2">
									<div className="w-12 h-12 rounded-full bg-champagne-100 text-champagne-700 flex items-center justify-center mb-1">
										<UploadCloudIcon className="w-6 h-6" />
									</div>
									<p className="text-sm font-semibold text-primary">
										{isDragging
											? "Suelta la imagen aquí"
											: "Arrastra una foto aquí o haz clic para seleccionarla"}
									</p>
									<p className="text-xs text-secondary">
										Formatos compatibles: JPG, PNG, WEBP, GIF
									</p>
								</div>
							)}
						</div>
					</label>
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
						{submitting ? "Subiendo…" : "Subir imagen"}
					</Button>
				</div>
			</form>
		</section>
	);
}
