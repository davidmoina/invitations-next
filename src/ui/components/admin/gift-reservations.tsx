"use client";
import { Button } from "@heroui/react";
import { useState } from "react";

import type { AdminGift } from "#/server/contracts/admin";
import type { ReserveGiftResult } from "#/server/contracts/public";
import { PlusIcon } from "../icons";
import { Modal } from "../modal";
import { FIELD_CLASS, LABEL_CLASS, orNull } from "./event-form-fields";
import { GiftForm, type GiftFormInput } from "./gift-form";

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
	onCreateGift?: (input: GiftFormInput) => Promise<{ id: string }>;
};

export function GiftReservations({
	gifts,
	onCancelReservation,
	onEditGift,
	onRefresh,
	onCreateGift,
}: GiftReservationsProps) {
	const [isAddGiftModalOpen, setIsAddGiftModalOpen] = useState(false);
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
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
				<div>
					<h2 className="font-serif text-xl text-primary font-semibold">
						Regalos
					</h2>
					<p className="text-xs text-secondary mt-0.5">
						Supervisa los regalos y el estado de sus reservas.
					</p>
				</div>
				{onCreateGift && (
					<Button
						type="button"
						variant="primary"
						size="sm"
						onPress={() => setIsAddGiftModalOpen(true)}
						className="self-start sm:self-auto"
					>
						<PlusIcon className="w-4 h-4" />
						<span>Añadir regalo</span>
					</Button>
				)}
			</div>

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
										<Button
											type="submit"
											variant="primary"
											size="sm"
											isDisabled={isSaving}
											isPending={isSaving}
										>
											{isSaving ? "Guardando…" : "Guardar cambios"}
										</Button>
										<Button
											type="button"
											variant="secondary"
											size="sm"
											isDisabled={isSaving}
											onPress={cancelEdit}
										>
											Cancelar
										</Button>
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
										<Button
											type="button"
											variant="outline"
											size="sm"
											aria-label={`Editar ${displayedGift.title}`}
											isDisabled={pending !== null}
											onPress={() => startEdit(displayedGift)}
										>
											Editar
										</Button>
										{displayedGift.reservedBy && (
											<Button
												type="button"
												variant="danger"
												size="sm"
												isDisabled={pending !== null}
												isPending={pending === displayedGift.id}
												onPress={() => cancel(displayedGift)}
											>
												Cancelar reserva de {displayedGift.title}
											</Button>
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

			{onCreateGift && (
				<Modal
					isOpen={isAddGiftModalOpen}
					onClose={() => setIsAddGiftModalOpen(false)}
					title="Añadir regalo"
					description="Añade un nuevo regalo a la mesa de regalos del evento."
				>
					<GiftForm
						onCreateGift={async (input) => {
							const res = await onCreateGift(input);
							setIsAddGiftModalOpen(false);
							await onRefresh?.();
							return res;
						}}
						onSuccess={() => setIsAddGiftModalOpen(false)}
						showHeader={false}
					/>
				</Modal>
			)}
		</section>
	);
}
