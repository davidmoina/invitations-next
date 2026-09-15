"use client";
import {
	Alert,
	Button,
	Input,
	Label,
	ListBox,
	NumberField,
	Select,
	TextField,
	toast,
} from "@heroui/react";
import { useMemo, useState } from "react";

import type { AdminGuest } from "#/server/contracts/admin";
import { PlusIcon, SearchIcon } from "../icons";
import { Modal } from "../modal";
import { FIELD_CLASS, LABEL_CLASS, orNull } from "./event-form-fields";
import { GuestIntakeForm, type GuestIntakeInput } from "./guest-intake-form";

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
	onIssueGuestLink?: (guestId: string) => Promise<{ url: string }>;
	onAddGuests?: (guests: GuestIntakeInput[]) => Promise<unknown>;
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

export function GuestList({
	guests,
	onEditGuest,
	onRefresh,
	onIssueGuestLink,
	onAddGuests,
}: GuestListProps) {
	const [guestOverrides, setGuestOverrides] = useState<
		Record<string, Partial<AdminGuest>>
	>({});
	const [prevGuests, setPrevGuests] = useState(guests);
	if (guests !== prevGuests) {
		setPrevGuests(guests);
		setGuestOverrides({});
	}

	const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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

	const [issuingGuestId, setIssuingGuestId] = useState<string | null>(null);
	const [issueError, setIssueError] = useState<{
		guestId: string;
		message: string;
	} | null>(null);

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
				Boolean(g.email?.toLowerCase().includes(q)) ||
				Boolean(g.phone?.toLowerCase().includes(q));

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

	const handleIssueGuestLink = async (guestId: string) => {
		if (!onIssueGuestLink || issuingGuestId) return;
		setIssuingGuestId(guestId);
		setIssueError(null);
		try {
			const { url } = await onIssueGuestLink(guestId);
			if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
				await navigator.clipboard.writeText(url);
			}
			toast.success("Enlace copiado al portapapeles.");
		} catch {
			setIssueError({
				guestId,
				message: "No hemos podido generar el enlace. Inténtalo de nuevo.",
			});
		} finally {
			setIssuingGuestId(null);
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
					<div className="mt-2 text-xs text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-3 py-1.5 inline-block">
						Aviso: Generar un nuevo enlace para un invitado invalida cualquier
						enlace anterior que se le haya emitido.
					</div>
				</div>
				{onAddGuests && (
					<div className="shrink-0 self-start sm:self-center">
						<Button
							type="button"
							variant="primary"
							size="sm"
							onPress={() => setIsAddModalOpen(true)}
						>
							<PlusIcon className="w-4 h-4" />
							<span>Añadir invitado</span>
						</Button>
					</div>
				)}
			</div>

			{/* Search & Filter Bar */}
			<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
				<div className="relative flex-1 max-w-md">
					<SearchIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-secondary" />
					<Input
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
								const isIssuing = issuingGuestId === guest.id;
								const hasIssueError = issueError?.guestId === guest.id;

								if (isEditing) {
									return (
										<tr key={guest.id} className="bg-champagne-50/50">
											<td colSpan={4} className="p-4">
												<form
													onSubmit={(e) => handleSaveEdit(guest.id, e)}
													className="space-y-4"
												>
													<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
														<TextField className="space-y-1">
															<Label
																htmlFor={`edit-guest-name-${guest.id}`}
																className={LABEL_CLASS}
															>
																Nombre
															</Label>
															<Input
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
														</TextField>
														<TextField className="space-y-1">
															<Label
																htmlFor={`edit-guest-email-${guest.id}`}
																className={LABEL_CLASS}
															>
																Email
															</Label>
															<Input
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
														</TextField>
														<Select
															name="attending"
															selectedKey={editForm.attending}
															onSelectionChange={(key) =>
																setEditForm((c) => ({
																	...c,
																	attending: key as
																		| "attending"
																		| "declined"
																		| "unanswered",
																}))
															}
															className="w-full"
														>
															<Label className={LABEL_CLASS}>Asistencia</Label>
															<Select.Trigger
																id={`edit-guest-attending-${guest.id}`}
																className="w-full"
															>
																<Select.Value />
																<Select.Indicator />
															</Select.Trigger>
															<Select.Popover>
																<ListBox>
																	<ListBox.Item
																		id="attending"
																		textValue="Asistirá"
																	>
																		Asistirá
																		<ListBox.ItemIndicator />
																	</ListBox.Item>
																	<ListBox.Item
																		id="declined"
																		textValue="No asistirá"
																	>
																		No asistirá
																		<ListBox.ItemIndicator />
																	</ListBox.Item>
																	<ListBox.Item
																		id="unanswered"
																		textValue="Sin respuesta"
																	>
																		Sin respuesta
																		<ListBox.ItemIndicator />
																	</ListBox.Item>
																</ListBox>
															</Select.Popover>
														</Select>
														<NumberField
															id={`edit-guest-companions-${guest.id}`}
															minValue={0}
															value={editForm.companions}
															onChange={(val) =>
																setEditForm((c) => ({
																	...c,
																	companions: Math.max(
																		0,
																		Number.isNaN(val) ? 0 : val,
																	),
																}))
															}
															className="space-y-1"
														>
															<Label
																htmlFor={`edit-guest-companions-${guest.id}`}
																className={LABEL_CLASS}
															>
																Acompañantes
															</Label>
															<NumberField.Input
																id={`edit-guest-companions-${guest.id}`}
																type="number"
																className={FIELD_CLASS}
															/>
														</NumberField>
													</div>

													{editError && (
														<Alert status="danger" role="alert">
															<Alert.Description>{editError}</Alert.Description>
														</Alert>
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
												<span>{guest.email ?? "Sin correo"}</span>
												{guest.phone ? <span> · {guest.phone}</span> : null}
											</div>
											{isSaved && (
												<Alert status="success" role="status" className="mt-1">
													<Alert.Description>
														Invitado actualizado.
													</Alert.Description>
												</Alert>
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
											<div className="flex flex-col items-end gap-1">
												<div className="flex items-center justify-end gap-2">
													<span title="Generar un nuevo enlace invalida el enlace anterior del invitado">
														<Button
															type="button"
															onPress={() => handleIssueGuestLink(guest.id)}
															isDisabled={isIssuing}
															isPending={isIssuing}
															variant="outline"
															size="sm"
														>
															{isIssuing ? "Copiando…" : "Copiar enlace"}
														</Button>
													</span>
													<Button
														type="button"
														aria-label={`Editar ${guest.displayName}`}
														onPress={() => startEdit(guest)}
														variant="outline"
														size="sm"
													>
														Editar
													</Button>
												</div>
												{hasIssueError && (
													<Alert status="danger" role="alert">
														<Alert.Description>
															{issueError.message}
														</Alert.Description>
													</Alert>
												)}
											</div>
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
					<Button
						type="button"
						variant="outline"
						size="sm"
						isDisabled={currentPage <= 1}
						onPress={() => setPage((p) => Math.max(1, p - 1))}
					>
						Anterior
					</Button>
					<span className="font-medium px-2">
						Página {currentPage} de {totalPages}
					</span>
					<Button
						type="button"
						variant="outline"
						size="sm"
						isDisabled={currentPage >= totalPages}
						onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
					>
						Siguiente
					</Button>
				</div>
			</div>

			{onAddGuests && (
				<Modal
					isOpen={isAddModalOpen}
					onClose={() => setIsAddModalOpen(false)}
					title="Añadir invitado"
					description="Registra manualmente un invitado en la lista del evento."
				>
					<GuestIntakeForm
						onAddGuests={async (newGuests) => {
							await onAddGuests(newGuests);
							await onRefresh?.();
						}}
						onSuccess={(addedAnother) => {
							if (!addedAnother) {
								setIsAddModalOpen(false);
							}
						}}
						showHeader={false}
					/>
				</Modal>
			)}
		</section>
	);
}
