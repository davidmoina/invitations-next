"use client";
import { useState } from "react";
import type { PublicGift, ReserveGiftResult } from "#/server/contracts/public";
import { ExternalLinkIcon, GiftIcon } from "./icons";

export type GiftRegistryProps = {
	giftRegistryEnabled: boolean;
	gifts: PublicGift[];
	onReserveGift: (input: { giftId: string }) => Promise<ReserveGiftResult>;
	onCancelReservation: (input: {
		giftId: string;
	}) => Promise<ReserveGiftResult>;
};

/** Two columns, not three. This grid renders inside the guest canvas, which
 *  `design.md` caps at `container-max-guest: 720px`; a third column would
 *  shrink each card to ~213px. The Stitch registry screen reaches ~320px cards
 *  by placing the same grid in a standalone 1024px page, a composition this
 *  app does not have — the registry is a section of the invitation, not a
 *  separate route. */
const GIFT_GRID_CLASS = "grid grid-cols-1 sm:grid-cols-2 gap-6";

export function GiftRegistry({
	giftRegistryEnabled,
	gifts,
	onReserveGift,
	onCancelReservation,
}: GiftRegistryProps) {
	const [loadingGiftId, setLoadingGiftId] = useState<string | null>(null);
	const [errorMap, setErrorMap] = useState<Record<string, string>>({});

	if (!giftRegistryEnabled) return null;

	const handleReserve = async (giftId: string) => {
		setLoadingGiftId(giftId);
		setErrorMap((prev) => ({ ...prev, [giftId]: "" }));

		try {
			const result = await onReserveGift({ giftId });
			if (!result.ok) {
				if (result.error.code === "gift_already_reserved") {
					setErrorMap((prev) => ({
						...prev,
						[giftId]: "Este regalo ya ha sido reservado por otro invitado.",
					}));
				} else {
					setErrorMap((prev) => ({
						...prev,
						[giftId]: "No se pudo realizar la reserva. Inténtalo de nuevo.",
					}));
				}
			}
		} catch {
			setErrorMap((prev) => ({
				...prev,
				[giftId]: "Error de conexión al reservar el regalo.",
			}));
		} finally {
			setLoadingGiftId(null);
		}
	};

	const handleCancel = async (giftId: string) => {
		setLoadingGiftId(giftId);
		setErrorMap((prev) => ({ ...prev, [giftId]: "" }));

		try {
			const result = await onCancelReservation({ giftId });
			if (!result.ok) {
				setErrorMap((prev) => ({
					...prev,
					[giftId]: "No se pudo cancelar la reserva.",
				}));
			}
		} catch {
			setErrorMap((prev) => ({
				...prev,
				[giftId]: "Error de conexión al cancelar la reserva.",
			}));
		} finally {
			setLoadingGiftId(null);
		}
	};

	return (
		<section id="registry" className="py-12 px-4 sm:px-6">
			<div className="text-center mb-8">
				<div className="w-12 h-12 bg-champagne-50 text-primary rounded-full flex items-center justify-center mx-auto mb-3 border border-champagne-100 shadow-sm">
					<GiftIcon className="w-6 h-6" />
				</div>
				<h2 className="font-serif text-3xl text-primary font-semibold mb-2">
					Mesa de regalos
				</h2>
				<p className="text-secondary text-sm max-w-md mx-auto">
					Tu presencia es nuestro mejor regalo, pero si deseas hacernos un
					detalle, aquí tienes algunas ideas que nos encantarían.
				</p>
			</div>

			{gifts.length === 0 ? (
				<div className="p-8 text-center bg-surface-container-lowest rounded-2xl border border-stone-200 text-secondary text-sm">
					No hay regalos añadidos todavía.
				</div>
			) : (
				<div className={GIFT_GRID_CLASS}>
					{gifts.map((gift) => {
						const isActionLoading = loadingGiftId === gift.id;
						const error = errorMap[gift.id];

						return (
							<div
								key={gift.id}
								className={`p-5 rounded-2xl border flex flex-col justify-between transition-all bg-surface-container-lowest ${
									gift.status === "reserved"
										? gift.reservedByMe
											? "border-primary-container bg-champagne-50/50 shadow-sm"
											: "border-stone-200 opacity-75"
										: "border-stone-200 shadow-sm hover:border-stone-300"
								}`}
							>
								<div>
									<div className="flex items-start justify-between gap-2 mb-2">
										<h3 className="font-semibold text-base text-on-surface">
											{gift.title}
										</h3>
										{gift.status === "available" ? (
											<span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-bg text-success-green shrink-0">
												Disponible
											</span>
										) : gift.reservedByMe ? (
											<span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-champagne-100 text-champagne-700 shrink-0">
												Reservado por ti
											</span>
										) : (
											<span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-secondary shrink-0">
												Reservado
											</span>
										)}
									</div>

									{gift.description && (
										<p className="text-sm text-secondary mb-3">
											{gift.description}
										</p>
									)}

									{gift.url && (
										<a
											href={gift.url}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mb-4 font-medium"
										>
											<span>Ver producto</span>
											<ExternalLinkIcon className="w-3.5 h-3.5" />
										</a>
									)}

									{error && (
										<p className="text-xs text-error font-medium mb-3">
											{error}
										</p>
									)}
								</div>

								<div className="pt-2">
									{gift.status === "available" ? (
										<button
											type="button"
											aria-label={`Reservar regalo: ${gift.title}`}
											disabled={isActionLoading}
											onClick={() => handleReserve(gift.id)}
											className="w-full py-2.5 px-4 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-1.5"
										>
											{isActionLoading ? "Reservando..." : "Reservar regalo"}
										</button>
									) : gift.reservedByMe ? (
										<button
											type="button"
											aria-label={`Cancelar reserva: ${gift.title}`}
											disabled={isActionLoading}
											onClick={() => handleCancel(gift.id)}
											className="w-full py-2.5 px-4 border border-stone-300 text-on-surface bg-white rounded-xl text-xs font-medium hover:bg-stone-50 disabled:opacity-50 transition-all shadow-sm flex items-center justify-center gap-1.5"
										>
											{isActionLoading ? "Cancelando..." : "Cancelar reserva"}
										</button>
									) : (
										<button
											type="button"
											disabled
											className="w-full py-2.5 px-4 bg-stone-100 text-secondary rounded-xl text-xs font-medium cursor-not-allowed opacity-75"
										>
											Reservado por otro invitado
										</button>
									)}
								</div>
							</div>
						);
					})}
				</div>
			)}
		</section>
	);
}
