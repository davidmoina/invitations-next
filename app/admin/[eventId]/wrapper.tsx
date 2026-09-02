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
			onAddGuests={(guests) => addGuests({ data: { eventId, guests } })}
			onCreateGift={(input) => createGift({ data: { ...input, eventId } })}
			onUpdateEvent={(input) => updateEvent({ data: { ...input, eventId } })}
			onInvite={(email) => inviteCollaborator({ data: { eventId, email } })}
			onRemove={(userId) => removeCollaborator({ data: { eventId, userId } })}
			onTransfer={(nextOwnerId) =>
				transferOwnershipAdmin({ data: { eventId, nextOwnerId } })
			}
			onSignOut={async () => {
				await fetch("/api/auth/sign-out", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: "{}",
				});
				router.push("/");
				router.refresh();
			}}
			onCancelReservation={(giftId) =>
				cancelReservationAdmin({ data: { eventId, giftId } })
			}
			onDeleteEvent={async () => {
				await deleteEvent({ data: { eventId } });
				router.push("/admin");
				router.refresh();
			}}
			onEditGift={(input) => editGift({ data: { ...input, eventId } })}
			onEditGuest={(input) => editGuest({ data: { ...input, eventId } })}
			onRefresh={() => router.refresh()}
		/>
	);
}
