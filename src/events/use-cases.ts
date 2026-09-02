import { can } from "#/accounts/authorization";
import type { Actor } from "#/audit/actor";
import { runMutation, transferOwnerRows } from "#/platform/db/domain-mutations";

export async function transferOwnership(
	actor: Extract<Actor, { kind: "organizer" }>,
	nextOwnerId: string,
) {
	if (!can(actor.role, "transferOwnership"))
		throw new Error("Only an event owner may transfer ownership");
	return runMutation(actor, async (tx) => {
		const owner = await transferOwnerRows(
			tx,
			actor.eventId,
			actor.userId,
			nextOwnerId,
		);
		if (!owner)
			throw new Error("Transfer target must be an existing event collaborator");
		return {
			value: { userId: owner.userId },
			events: [
				{
					action: "event.ownership_transferred",
					entityType: "event_membership",
					entityId: owner.userId,
					eventId: actor.eventId,
				},
			],
		};
	});
}
