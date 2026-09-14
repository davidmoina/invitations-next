"use client";
import { Alert, Button } from "@heroui/react";
import { useState } from "react";

import type { AdminMembership } from "#/server/contracts/admin";

export type CollaboratorsPanelProps = {
	memberships: AdminMembership[];
	viewerRole: "owner" | "editor";
	/** Failure arrives as a rejection; the resolved value is not used. */
	onInvite: (email: string) => Promise<unknown>;
	onRemove: (userId: string) => Promise<unknown>;
	onTransfer: (userId: string) => Promise<unknown>;
};

const ROLE_LABEL: Record<AdminMembership["role"], string> = {
	owner: "Propietario",
	editor: "Editor",
};

export function CollaboratorsPanel({
	memberships,
	viewerRole,
	onInvite,
	onRemove,
	onTransfer,
}: CollaboratorsPanelProps) {
	// The authorization matrix grants invite/remove/transferOwnership to the
	// owner only. The server enforces it; hiding the controls keeps the screen
	// from offering an action it knows will be refused.
	const isOwner = viewerRole === "owner";
	const [email, setEmail] = useState("");
	const [pending, setPending] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [confirmingTransfer, setConfirmingTransfer] = useState<string | null>(
		null,
	);

	const run = async (key: string, action: () => Promise<unknown>) => {
		setPending(key);
		setError(null);
		try {
			await action();
			return true;
		} catch {
			// Never surface the raw failure: it can carry internal detail.
			setError("No hemos podido completar la acción. Inténtalo de nuevo.");
			return false;
		} finally {
			setPending(null);
		}
	};

	const handleInvite = async (event: React.FormEvent) => {
		event.preventDefault();
		const address = email.trim();
		if (!address || pending) return;
		if (await run("invite", () => onInvite(address))) setEmail("");
	};

	return (
		<section
			aria-label="Colaboradores"
			className="px-4 py-6 border-t border-stone-200/80"
		>
			<h2 className="font-serif text-xl text-primary font-semibold mb-4">
				Colaboradores
			</h2>

			<ul className="space-y-2 mb-4">
				{memberships.map((member) => {
					const actionable = isOwner && !member.isCurrentUser;
					return (
						<li
							key={member.userId}
							className="flex items-center justify-between gap-3 p-3 bg-stone-50 rounded-xl border border-stone-200"
						>
							<div className="min-w-0">
								<p className="text-sm font-medium text-on-surface truncate">
									{member.displayName}
								</p>
								<p className="text-xs text-secondary truncate">
									{member.email} · {ROLE_LABEL[member.role]}
								</p>
							</div>
							{actionable && (
								<div className="flex items-center gap-2 shrink-0">
									{member.role === "editor" &&
										(confirmingTransfer === member.userId ? (
											<Button
												type="button"
												variant="primary"
												size="sm"
												isDisabled={pending !== null}
												isPending={pending === member.userId}
												onPress={() =>
													run(member.userId, () =>
														onTransfer(member.userId),
													).then(() => setConfirmingTransfer(null))
												}
											>
												Confirmar traspaso
											</Button>
										) : (
											<Button
												type="button"
												variant="outline"
												size="sm"
												isDisabled={pending !== null}
												onPress={() => setConfirmingTransfer(member.userId)}
											>
												Transferir a {member.displayName}
											</Button>
										))}
									<Button
										type="button"
										variant="danger"
										size="sm"
										isDisabled={pending !== null}
										isPending={pending === member.userId}
										onPress={() =>
											run(member.userId, () => onRemove(member.userId))
										}
									>
										Quitar a {member.displayName}
									</Button>
								</div>
							)}
						</li>
					);
				})}
			</ul>

			{isOwner && (
				<form onSubmit={handleInvite} className="flex items-end gap-2">
					<div className="flex-1">
						<label
							htmlFor="collaborator-email"
							className="block text-xs font-medium text-secondary mb-1"
						>
							Correo del colaborador
						</label>
						<input
							id="collaborator-email"
							type="email"
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
						/>
					</div>
					<Button
						type="submit"
						variant="primary"
						isDisabled={pending !== null}
						isPending={pending === "invite"}
					>
						Invitar
					</Button>
				</form>
			)}

			{error && (
				<Alert status="danger" role="alert" className="mt-3">
					<Alert.Description>{error}</Alert.Description>
				</Alert>
			)}
		</section>
	);
}
