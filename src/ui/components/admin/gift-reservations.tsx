"use client";
import { useState } from "react";

import type { AdminGift } from "#/server/contracts/admin";
import type { ReserveGiftResult } from "#/server/contracts/public";
import { FIELD_CLASS, LABEL_CLASS, orNull } from "./event-form-fields";

export type EditGiftInput = {
	giftId: string;
	title?: string;
	description?: string | null;
	url?: string | null;
	imagePublicId?: string | null;
	position?: number;
};

export type GiftReservationsProps = {
	gifts: AdminGift[];
	/**
	 * Resolves with the outcome rather than throwing on refusal, so the caller
	 * must inspect `ok` — see the handler below.
	 */
	onCancelReservation: (giftId: string) => Promise<ReserveGiftResult>;
	onEditGift?: (input: EditGiftInput) => Promise<{ id: string }>;
	onRefresh?: () => Promise<void> | void;
};

export function GiftReservations({
	gifts,
	onCancelReservation,
	onEditGift,
	onRefresh,
}: GiftReservationsProps) {
	const [pending, setPending] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const [giftOverrides, setGiftOverrides] = useState<
		Record<string, Partial<AdminGift>>
	>({});
	const [prevGifts, setPrevGifts] = useState(gifts);
	if (gifts !== prevGifts) {
		setPrevGifts(gifts);
		setGiftOverrides({});
	}
	const [editingGiftId, setEditingGiftId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState({
		title: "",
		description: "",
		url: "",
		imagePublicId: "",
		position: "",
	});
	const [savingGiftId, setSavingGiftId] = useState<string | null>(null);
	const [editError, setEditError] = useState<string | null>(null);
	const [savedGiftId, setSavedGiftId] = useState<string | null>(null);

	const startEdit = (gift: AdminGift) => {
		const rawPosition = (gift as unknown as { position?: number | null })
			.position;
		setEditingGiftId(gift.id);
		setEditForm({
			title: gift.title,
			description: gift.description ?? "",
			url: gift.url ?? "",
			imagePublicId: gift.imagePublicId ?? "",
			position:
				rawPosition !== undefined && rawPosition !== null
					? String(rawPosition)
					: "",
		});
		setEditError(null);
		setSavedGiftId(null);
	};

	const cancelEdit = () => {
		setEditingGiftId(null);
		setEditError(null);
	};

	const handleSaveEdit = async (giftId: string, event: React.FormEvent) => {
		event.preventDefault();
		if (!onEditGift || savingGiftId) return;
		const title = editForm.title.trim();
		if (title === "") {
			setEditError("Pon un título al regalo.");
			return;
		}

		setSavingGiftId(giftId);
		setEditError(null);
		try {
			const patch: EditGiftInput = {
				giftId,
				title,
				description: orNull(editForm.description),
				url: orNull(editForm.url),
				imagePublicId: orNull(editForm.imagePublicId),
			};
			if (editForm.position.trim() !== "") {
				const parsedPosition = Number(editForm.position);
				if (!Number.isNaN(parsedPosition)) {
					patch.position = parsedPosition;
				}
			}
			await onEditGift(patch);
			setSavedGiftId(giftId);
			setEditingGiftId(null);
			if (onRefresh) {
				await onRefresh();
				setGiftOverrides((prev) => {
					const next = { ...prev };
					delete next[giftId];
					return next;
				});
			} else {
				setGiftOverrides((prev) => ({
					...prev,
					[giftId]: {
						title,
						description: orNull(editForm.description),
						url: orNull(editForm.url),
						imagePublicId: orNull(editForm.imagePublicId),
						...(patch.position !== undefined
							? { position: patch.position }
							: {}),
					},
				}));
			}
		} catch {
			setEditError("No hemos podido actualizar el regalo. Inténtalo de nuevo.");
		} finally {
			setSavingGiftId(null);
		}
	};

	const cancel = async (gift: AdminGift) => {
		if (pending) return;
		setPending(gift.id);
		setError(null);
		try {
			// A refused cancellation RESOLVES with `{ ok: false }`. Treating a
			// non-throwing call as success would report a released reservation
			// that the server actually kept.
			const result = await onCancelReservation(gift.id);
			if (!result.ok) {
				setError(
					`No se ha podido liberar «${gift.title}». Puede que la reserva ya no exista.`,
				);
			}
		} catch {
			setError("Error de conexión. Vuelve a intentarlo.");
		} finally {
			setPending(null);
		}
	};

	return (
		<section
			aria-label="Regalos reservados"
			className="px-4 py-6 border-t border-stone-200/80"
		>
			<h2 className="font-serif text-xl text-primary font-semibold mb-4">
				Regalos
			</h2>

			<ul className="space-y-2">
				{gifts.map((gift) => {
					const displayedGift: AdminGift = {
						...gift,
						...(giftOverrides[gift.id] ?? {}),
					};
					const isEditing = editingGiftId === displayedGift.id;
					const isSaving = savingGiftId === displayedGift.id;
					const isSaved = savedGiftId === displayedGift.id;

					return (
						<li
							key={displayedGift.id}
							className="p-3 bg-stone-50 rounded-xl border border-stone-200"
						>
							{isEditing ? (
								<form
									onSubmit={(e) => handleSaveEdit(displayedGift.id, e)}
									className="space-y-3"
								>
									<div>
										<label
											htmlFor={`edit-gift-title-${displayedGift.id}`}
											className={LABEL_CLASS}
										>
											Título
										</label>
										<input
											id={`edit-gift-title-${displayedGift.id}`}
											value={editForm.title}
											onChange={(e) =>
												setEditForm((c) => ({ ...c, title: e.target.value }))
											}
											className={FIELD_CLASS}
										/>
									</div>

									<div>
										<label
											htmlFor={`edit-gift-description-${displayedGift.id}`}
											className={LABEL_CLASS}
										>
											Descripción
										</label>
										<textarea
											id={`edit-gift-description-${displayedGift.id}`}
											value={editForm.description}
											onChange={(e) =>
												setEditForm((c) => ({
													...c,
													description: e.target.value,
												}))
											}
											className={FIELD_CLASS}
										/>
									</div>

									<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
										<div>
											<label
												htmlFor={`edit-gift-url-${displayedGift.id}`}
												className={LABEL_CLASS}
											>
												Enlace
											</label>
											<input
												id={`edit-gift-url-${displayedGift.id}`}
												type="url"
												value={editForm.url}
												onChange={(e) =>
													setEditForm((c) => ({ ...c, url: e.target.value }))
												}
												className={FIELD_CLASS}
											/>
										</div>
										<div>
											<label
												htmlFor={`edit-gift-image-${displayedGift.id}`}
												className={LABEL_CLASS}
											>
												Imagen
											</label>
											<input
												id={`edit-gift-image-${displayedGift.id}`}
												value={editForm.imagePublicId}
												onChange={(e) =>
													setEditForm((c) => ({
														...c,
														imagePublicId: e.target.value,
													}))
												}
												className={FIELD_CLASS}
											/>
										</div>
									</div>

									<div>
										<label
											htmlFor={`edit-gift-position-${displayedGift.id}`}
											className={LABEL_CLASS}
										>
											Posición
										</label>
										<input
											id={`edit-gift-position-${displayedGift.id}`}
											type="number"
											min={0}
											value={editForm.position}
											onChange={(e) =>
												setEditForm((c) => ({
													...c,
													position: e.target.value,
												}))
											}
											className={FIELD_CLASS}
										/>
									</div>

									{editError && (
										<p
											role="alert"
											className="p-3 bg-error-container text-error rounded-xl text-xs font-medium"
										>
											{editError}
										</p>
									)}

									<div className="flex items-center gap-2">
										<button
											type="submit"
											disabled={isSaving}
											className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium disabled:opacity-40"
										>
											{isSaving ? "Guardando…" : "Guardar cambios"}
										</button>
										<button
											type="button"
											disabled={isSaving}
											onClick={cancelEdit}
											className="px-3 py-1.5 rounded-lg border border-stone-300 text-on-surface text-xs font-medium hover:bg-stone-100 disabled:opacity-40"
										>
											Cancelar
										</button>
									</div>
								</form>
							) : (
								<div className="flex items-center justify-between gap-3">
									<div className="min-w-0">
										<p className="text-sm font-medium text-on-surface truncate">
											{displayedGift.title}
										</p>
										<p className="text-xs text-secondary truncate">
											{displayedGift.reservedBy
												? `Reservado por ${displayedGift.reservedBy.displayName}`
												: "Disponible"}
										</p>
										{isSaved && (
											<output className="mt-1 text-xs text-primary font-medium block">
												Regalo actualizado.
											</output>
										)}
									</div>
									<div className="flex items-center gap-2 shrink-0">
										<button
											type="button"
											aria-label={`Editar ${displayedGift.title}`}
											disabled={pending !== null}
											onClick={() => startEdit(displayedGift)}
											className="text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-300 text-on-surface hover:bg-stone-100 disabled:opacity-40"
										>
											Editar
										</button>
										{displayedGift.reservedBy && (
											<button
												type="button"
												disabled={pending !== null}
												onClick={() => cancel(displayedGift)}
												className="text-xs font-medium px-3 py-1.5 rounded-lg border border-stone-300 text-error hover:bg-stone-100 disabled:opacity-40"
											>
												Cancelar reserva de {displayedGift.title}
											</button>
										)}
									</div>
								</div>
							)}
						</li>
					);
				})}
			</ul>

			{error && (
				<p
					role="alert"
					className="mt-3 p-3 bg-error-container text-error rounded-xl text-xs font-medium"
				>
					{error}
				</p>
			)}
		</section>
	);
}
