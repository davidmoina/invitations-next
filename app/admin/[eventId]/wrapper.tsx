"use client";

import { useRouter } from "next/navigation";
import type { ComponentProps } from "react";
import {
	addGuests,
	cancelReservationAdmin,
	createGift,
	deleteEvent,
	editGift,
	editGuest,
	inviteCollaborator,
	issueGuestLink,
	removeCollaborator,
	transferOwnershipAdmin,
	updateEvent,
} from "#/api-client";
import { AdminEventShell } from "#/ui/admin-event-shell";

export function AdminEventWrapper({
	data,
	audit,
	eventId,
}: {
	data: ComponentProps<typeof AdminEventShell>["data"];
	audit: ComponentProps<typeof AdminEventShell>["audit"];
	eventId: string;
}) {
	const router = useRouter();
	return (
		<AdminEventShell
			data={data}
			audit={audit}
			onAddGuests={(guests) => addGuests({ eventId, guests })}
			onCreateGift={(input) => createGift({ ...input, eventId })}
			onUpdateEvent={(input) => updateEvent({ ...input, eventId })}
			onInvite={(email) => inviteCollaborator({ eventId, email })}
			onRemove={(userId) => removeCollaborator({ eventId, userId })}
			onTransfer={(nextOwnerId) =>
				transferOwnershipAdmin({ eventId, nextOwnerId })
			}
			onSignOut={async () => {
				// TODO: switch to signOut() from #/api-client once it lands
				await fetch("/api/auth/sign-out", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: "{}",
				});
				router.push("/");
				router.refresh();
			}}
			onCancelReservation={(giftId) =>
				cancelReservationAdmin({ eventId, giftId })
			}
			onDeleteEvent={async () => {
				await deleteEvent({ eventId });
				router.push("/admin");
				router.refresh();
			}}
			onEditGift={(input) => editGift({ ...input, eventId })}
			onEditGuest={(input) => editGuest({ ...input, eventId })}
			onIssueGuestLink={(guestId) => issueGuestLink({ eventId, guestId })}
			onRefresh={() => router.refresh()}
		/>
	);
}
