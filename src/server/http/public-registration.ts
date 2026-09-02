import "server-only";

import type { EventId } from "#/audit/actor";
import { issueGuestTokenFor, registerPublicGuest } from "#/guests/use-cases";
import { getEventStartsAt, runMutation } from "#/platform/db/domain-mutations";
import { AccessError } from "#/server/access-error";

export async function registerGuestForEvent(
	eventId: EventId,
	input: { displayName: string; email: string | null },
): Promise<string> {
	const registration = await registerPublicGuest(eventId, input);
	return runMutation(
		{ kind: "system", reason: "public_registration" as never },
		async (tx) => {
			const startsAt = await getEventStartsAt(tx, eventId);
			if (!startsAt) throw new AccessError("not_found");
			const token = await issueGuestTokenFor(
				tx,
				eventId,
				registration.id,
				startsAt,
			);
			return {
				value: token,
				events: [
					{
						action: "guest_token.issued",
						entityType: "guest_token",
						entityId: registration.id,
						eventId,
					},
				],
			};
		},
	);
}
