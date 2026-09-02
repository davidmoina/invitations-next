import { can } from "#/accounts/authorization";
import type { Actor } from "#/audit/actor";
import {
	insertGuestMessage,
	listMessagesForEvent,
	runMutation,
} from "#/platform/db/domain-mutations";

export async function submitGuestMessage(
	actor: Extract<Actor, { kind: "guest" }>,
	body: string,
) {
	return runMutation(actor, async (tx) => {
		const message = await insertGuestMessage(tx, {
			eventId: actor.eventId,
			guestId: actor.guestId,
			body: body.trim(),
		});
		if (!message) throw new Error("Message did not persist");
		return {
			value: message,
			events: [
				{
					action: "message.submitted",
					entityType: "guest_message",
					entityId: message.id,
					eventId: actor.eventId,
				},
			],
		};
	});
}

export async function listOrganizerMessages(
	actor: Extract<Actor, { kind: "organizer" }>,
) {
	if (!can(actor.role, "viewAudit"))
		throw new Error("Organizer access is required");
	return listMessagesForEvent(actor.eventId);
}
