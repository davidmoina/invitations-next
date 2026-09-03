"use client";
import { useEffect, useState } from "react";
import type { PublicEventPageData } from "#/server/contracts/public";
import { XCircleIcon } from "./icons";

export type MediaGalleryProps = {
	media: PublicEventPageData["media"];
};

export function MediaGallery({ media }: MediaGalleryProps) {
	const [activeImageIndex, setActiveImageIndex] = useState<number | null>(null);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setActiveImageIndex(null);
			}
		};
		if (activeImageIndex !== null) {
			window.addEventListener("keydown", handleKeyDown);
		}
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [activeImageIndex]);

	if (!media || media.length === 0) return null;

	return (
		<section id="gallery" className="py-12 px-4 max-w-2xl mx-auto">
			<div className="text-center mb-8">
				<h2 className="font-serif text-3xl text-primary font-semibold mb-2">
					Galería de fotos
				</h2>
				<p className="text-secondary text-sm">
					Momentos especiales de nuestra historia
				</p>
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
				{media.map((item, index) => (
					<button
						key={item.id}
						type="button"
						onClick={() => setActiveImageIndex(index)}
						className="group aspect-square rounded-2xl overflow-hidden bg-stone-200 border border-stone-200 shadow-sm relative focus:outline-none focus:ring-2 focus:ring-primary"
					>
						{/* biome-ignore lint/performance/noImgElement: keeping original img */}
						<img
							src={item.urls.card || item.urls.thumb}
							alt={item.alt || `Foto ${index + 1}`}
							className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
							loading="lazy"
						/>
					</button>
				))}
			</div>

			{/* Fullscreen lightbox view */}
			{activeImageIndex !== null && media[activeImageIndex] && (
				<div
					role="dialog"
					aria-modal="true"
					className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
				>
					<button
						type="button"
						aria-label="Cerrar fondo de foto"
						onClick={() => setActiveImageIndex(null)}
						className="absolute inset-0 w-full h-full cursor-default"
					/>
					<button
						type="button"
						aria-label="Cerrar foto"
						onClick={() => setActiveImageIndex(null)}
						className="absolute top-4 right-4 z-10 text-white hover:text-stone-300 p-2"
					>
						<XCircleIcon className="w-8 h-8" />
					</button>
					{/* biome-ignore lint/performance/noImgElement: keeping original img */}
					<img
						src={
							media[activeImageIndex].urls.full ||
							media[activeImageIndex].urls.card
						}
						alt={media[activeImageIndex].alt || "Foto ampliada"}
						className="relative z-10 max-h-[85vh] max-w-full rounded-xl object-contain shadow-2xl"
					/>
				</div>
			)}
		</section>
	);
}
