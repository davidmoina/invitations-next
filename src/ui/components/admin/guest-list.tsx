"use client";
import { useMemo, useState } from "react";

import type { AdminGuest } from "#/server/contracts/admin";
import { SearchIcon } from "../icons";
import { FIELD_CLASS, LABEL_CLASS, orNull } from "./event-form-fields";

export type EditGuestInput = {
	guestId: string;
	displayName?: string;
	email?: string | null;
	attending?: boolean | null;
	companions?: number;
};

export type GuestListProps = {
	guests: AdminGuest[];
	onEditGuest?: (input: EditGuestInput) => Promise<{ id: string }>;
	onRefresh?: () => Promise<void> | void;
};

type StatusFilter = "all" | "attending" | "declined" | "unanswered";

export function answerLabel(guest: AdminGuest): string {
	if (guest.attending === null) return "Sin respuesta";
	if (!guest.attending) return "No asistirá";
	return guest.companions > 0
		? `Asistirá · ${guest.companions} acompañantes`
		: "Asistirá";
}

function parseGuestError(error: unknown): string {
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code: unknown }).code === "companion_cap_exceeded"
	) {
		const max = (error as { maxCompanions?: number }).maxCompanions ?? 0;
		return `El número máximo de acompañantes permitido es ${max}.`;
	}
	return "No hemos podido actualizar el invitado. Inténtalo de nuevo.";
}

const PAGE_SIZE = 10;

export function GuestList({ guests, onEditGuest, onRefresh }: GuestListProps) {
	const [guestOverrides, setGuestOverrides] = useState<
		Record<string, Partial<AdminGuest>>
	>({});
	const [prevGuests, setPrevGuests] = useState(guests);
	if (guests !== prevGuests) {
		setPrevGuests(guests);
		setGuestOverrides({});
	}

	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [page, setPage] = useState(1);

	const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
	const [editForm, setEditForm] = useState({
		displayName: "",
		email: "",
		attending: "unanswered" as "attending" | "declined" | "unanswered",
		companions: 0,
	});
	const [savingGuestId, setSavingGuestId] = useState<string | null>(null);
	const [editError, setEditError] = useState<string | null>(null);
	const [savedGuestId, setSavedGuestId] = useState<string | null>(null);

	const mergedGuests = useMemo(() => {
		return guests.map((g) => ({
			...g,
			...(guestOverrides[g.id] ?? {}),
		}));
	}, [guests, guestOverrides]);

	const filteredGuests = useMemo(() => {
		const q = search.trim().toLowerCase();
		return mergedGuests.filter((g) => {
			const matchesSearch =
				q === "" ||
				g.displayName.toLowerCase().includes(q) ||
				Boolean(g.email?.toLowerCase().includes(q));

			if (!matchesSearch) return false;

			if (statusFilter === "attending") return g.attending === true;
			if (statusFilter === "declined") return g.attending === false;
			if (statusFilter === "unanswered") return g.attending === null;
			return true;
		});
	}, [mergedGuests, search, statusFilter]);

	const totalPages = Math.max(1, Math.ceil(filteredGuests.length / PAGE_SIZE));
	const currentPage = Math.min(page, totalPages);
	const paginatedGuests = useMemo(() => {
		const start = (currentPage - 1) * PAGE_SIZE;
		return filteredGuests.slice(start, start + PAGE_SIZE);
	}, [filteredGuests, currentPage]);

	const startCount =
		filteredGuests.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
	const endCount = Math.min(currentPage * PAGE_SIZE, filteredGuests.length);

	const startEdit = (guest: AdminGuest) => {
		setEditingGuestId(guest.id);
		setEditForm({
			displayName: guest.displayName,
			email: guest.email ?? "",
			attending:
				guest.attending === null
					? "unanswered"
					: guest.attending
						? "attending"
						: "declined",
			companions: guest.companions,
		});
		setEditError(null);
		setSavedGuestId(null);
	};

	const cancelEdit = () => {
		setEditingGuestId(null);
		setEditError(null);
	};

	const handleSaveEdit = async (guestId: string, event: React.FormEvent) => {
		event.preventDefault();
		if (!onEditGuest || savingGuestId) return;
		const name = editForm.displayName.trim();
		if (name === "") {
			setEditError("Indica el nombre del invitado.");
			return;
		}

		setSavingGuestId(guestId);
		setEditError(null);
		try {
			const attendingValue =
				editForm.attending === "attending"
					? true
					: editForm.attending === "declined"
						? false
						: null;

			const patch: EditGuestInput = {
				guestId,
				displayName: name,
				email: orNull(editForm.email),
				attending: attendingValue,
				companions: editForm.companions,
			};

			await onEditGuest(patch);
			setSavedGuestId(guestId);
			setEditingGuestId(null);
			if (onRefresh) {
				await onRefresh();
				setGuestOverrides((prev) => {
					const next = { ...prev };
					delete next[guestId];
					return next;
				});
			} else {
				setGuestOverrides((prev) => ({
					...prev,
					[guestId]: {
						displayName: name,
						email: orNull(editForm.email),
						attending: attendingValue,
						companions: editForm.companions,
					},
				}));
			}
		} catch (err) {
			setEditError(parseGuestError(err));
		} finally {
			setSavingGuestId(null);
		}
	};

	return (
		<section
			aria-label="Invitados"
			className="p-6 bg-surface rounded-2xl border border-stone-200/80 shadow-2xs space-y-6"
		>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h2 className="font-serif italic text-2xl font-bold text-primary">
						Lista de Invitados
					</h2>
					<p className="text-xs sm:text-sm text-secondary mt-0.5">
						Supervisa el estado de confirmaciones y datos de contacto en tiempo
						real.
					</p>
				</div>
			</div>

			{/* Search & Filter Bar */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="relative flex-1 max-w-md">
					<SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
					<input
						type="text"
						value={search}
						onChange={(e) => {
							setSearch(e.target.value);
							setPage(1);
						}}
						placeholder="Buscar invitado por nombre o email..."
						className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-50 border border-stone-200 text-sm text-on-surface focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-hidden"
					/>
				</div>

				<div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
					<button
						type="button"
						onClick={() => {
							setStatusFilter("all");
							setPage(1);
						}}
						className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
							statusFilter === "all"
								? "bg-primary text-white"
								: "bg-stone-100 text-secondary hover:bg-stone-200"
						}`}
					>
						Todos ({mergedGuests.length})
					</button>
					<button
						type="button"
						onClick={() => {
							setStatusFilter("attending");
							setPage(1);
						}}
						className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
							statusFilter === "attending"
								? "bg-primary text-white"
								: "bg-stone-100 text-secondary hover:bg-stone-200"
						}`}
					>
						Asistirán ({mergedGuests.filter((g) => g.attending === true).length}
						)
					</button>
					<button
						type="button"
						onClick={() => {
							setStatusFilter("declined");
							setPage(1);
						}}
						className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
							statusFilter === "declined"
								? "bg-primary text-white"
								: "bg-stone-100 text-secondary hover:bg-stone-200"
						}`}
					>
						No asistirán (
						{mergedGuests.filter((g) => g.attending === false).length})
					</button>
					<button
						type="button"
						onClick={() => {
							setStatusFilter("unanswered");
							setPage(1);
						}}
						className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
							statusFilter === "unanswered"
								? "bg-primary text-white"
								: "bg-stone-100 text-secondary hover:bg-stone-200"
						}`}
					>
						Sin respuesta (
						{mergedGuests.filter((g) => g.attending === null).length})
					</button>
				</div>
			</div>

			{/* Data Table */}
			<div className="overflow-x-auto rounded-xl border border-stone-200">
				<table className="w-full text-left text-sm divide-y divide-stone-200">
					<thead className="bg-stone-50 font-medium text-xs text-secondary uppercase tracking-wider">
						<tr>
							<th scope="col" className="px-6 py-3.5">
								Invitado
							</th>
							<th scope="col" className="px-6 py-3.5">
								Estado
							</th>
							<th scope="col" className="px-6 py-3.5">
								Acompañantes
							</th>
							<th scope="col" className="px-6 py-3.5 text-right">
								Acciones
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-stone-200 bg-surface">
						{paginatedGuests.length === 0 ? (
							<tr>
								<td
									colSpan={4}
									className="px-6 py-10 text-center text-sm text-secondary"
								>
									No se encontraron invitados.
								</td>
							</tr>
						) : (
							paginatedGuests.map((guest) => {
								const isEditing = editingGuestId === guest.id;
								const isSaving = savingGuestId === guest.id;
								const isSaved = savedGuestId === guest.id;

								if (isEditing) {
									return (
										<tr key={guest.id} className="bg-champagne-50/50">
											<td colSpan={4} className="p-4">
												<form
													onSubmit={(e) => handleSaveEdit(guest.id, e)}
													className="space-y-4"
												>
													<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
														<div>
															<label
																htmlFor={`edit-guest-name-${guest.id}`}
																className={LABEL_CLASS}
															>
																Nombre
															</label>
															<input
																id={`edit-guest-name-${guest.id}`}
																value={editForm.displayName}
																onChange={(e) =>
																	setEditForm((c) => ({
																		...c,
																		displayName: e.target.value,
																	}))
																}
																className={FIELD_CLASS}
															/>
														</div>
														<div>
															<label
																htmlFor={`edit-guest-email-${guest.id}`}
																className={LABEL_CLASS}
															>
																Email
															</label>
															<input
																id={`edit-guest-email-${guest.id}`}
																type="email"
																value={editForm.email}
																onChange={(e) =>
																	setEditForm((c) => ({
																		...c,
																		email: e.target.value,
																	}))
																}
																className={FIELD_CLASS}
															/>
														</div>
														<div>
															<label
																htmlFor={`edit-guest-attending-${guest.id}`}
																className={LABEL_CLASS}
															>
																Asistencia
															</label>
															<select
																id={`edit-guest-attending-${guest.id}`}
																value={editForm.attending}
																onChange={(e) =>
																	setEditForm((c) => ({
																		...c,
																		attending: e.target.value as
																			| "attending"
																			| "declined"
																			| "unanswered",
																	}))
																}
																className={FIELD_CLASS}
															>
																<option value="attending">Asistirá</option>
																<option value="declined">No asistirá</option>
																<option value="unanswered">
																	Sin respuesta
																</option>
															</select>
														</div>
														<div>
															<label
																htmlFor={`edit-guest-companions-${guest.id}`}
																className={LABEL_CLASS}
															>
																Acompañantes
															</label>
															<input
																id={`edit-guest-companions-${guest.id}`}
																type="number"
																min={0}
																value={editForm.companions}
																onChange={(e) =>
																	setEditForm((c) => ({
																		...c,
																		companions: Math.max(
																			0,
																			Number(e.target.value) || 0,
																		),
																	}))
																}
																className={FIELD_CLASS}
															/>
														</div>
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
															className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-medium shadow-xs disabled:opacity-40"
														>
															{isSaving ? "Guardando…" : "Guardar cambios"}
														</button>
														<button
															type="button"
															disabled={isSaving}
															onClick={cancelEdit}
															className="px-4 py-2 rounded-xl border border-stone-300 text-on-surface text-xs font-medium hover:bg-stone-100 disabled:opacity-40"
														>
															Cancelar
														</button>
													</div>
												</form>
											</td>
										</tr>
									);
								}

								return (
									<tr
										key={guest.id}
										className="hover:bg-stone-50/70 transition-colors"
									>
										<td className="px-6 py-4">
											<div className="font-semibold text-on-surface">
												{guest.displayName}
											</div>
											<div className="text-xs text-secondary mt-0.5">
												{guest.email ?? "Sin correo"}
											</div>
											{isSaved && (
												<output className="mt-1 text-xs text-primary font-medium block">
													Invitado actualizado.
												</output>
											)}
										</td>
										<td className="px-6 py-4">
											<span
												className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
													guest.attending === true
														? "bg-success-bg text-success-green"
														: guest.attending === false
															? "bg-stone-100 text-secondary"
															: "bg-warning-bg text-warning-amber"
												}`}
											>
												{guest.attending === true
													? "Confirmado"
													: guest.attending === false
														? "No asistirá"
														: "Pendiente"}
											</span>
										</td>
										<td className="px-6 py-4 text-secondary">
											{answerLabel(guest)}
										</td>
										<td className="px-6 py-4 text-right">
											<button
												type="button"
												aria-label={`Editar ${guest.displayName}`}
												onClick={() => startEdit(guest)}
												className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-medium text-on-surface hover:bg-stone-100 transition-colors focus-visible:ring-2 focus-visible:ring-primary"
											>
												Editar
											</button>
										</td>
									</tr>
								);
							})
						)}
					</tbody>
				</table>
			</div>

			{/* Pagination Footer */}
			<div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-secondary pt-2">
				<p>
					Mostrando {startCount} a {endCount} de {filteredGuests.length}{" "}
					invitados
				</p>
				<div className="flex items-center gap-2">
					<button
						type="button"
						disabled={currentPage <= 1}
						onClick={() => setPage((p) => Math.max(1, p - 1))}
						className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
					>
						Anterior
					</button>
					<span className="font-medium px-2">
						Página {currentPage} de {totalPages}
					</span>
					<button
						type="button"
						disabled={currentPage >= totalPages}
						onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
						className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 disabled:opacity-40 disabled:pointer-events-none transition-colors"
					>
						Siguiente
					</button>
				</div>
			</div>
		</section>
	);
}
