import type { Actor, EventId } from "#/audit/actor";
import { findEventIdBySlug } from "#/platform/db/actor-queries";
import { AccessError } from "#/server/access-error";
import { resolveRequestActor } from "#/server/middleware/resolve-actor";

export function requireGuest(
	actor: Actor | null,
): Extract<Actor, { kind: "guest" }> {
	if (!actor) throw new AccessError("unauthorized");
	if (actor.kind !== "guest") throw new AccessError("forbidden");
	return actor;
}

/** Rejects a guest token unless it belongs to the event selected by the URL. */
export function requireGuestForEvent(
	actor: Actor | null,
	eventId: EventId,
): Extract<Actor, { kind: "guest" }> {
	const guest = requireGuest(actor);
	if (guest.eventId !== eventId) throw new AccessError("unauthorized");
	return guest;
}

/** Resolves the immutable slug scope before accepting a guest cookie. */
export async function requireGuestForSlug(
	request: Request,
	slug: string,
): Promise<Extract<Actor, { kind: "guest" }>> {
	const eventId = await findEventIdBySlug(slug);
	if (!eventId) throw new AccessError("not_found");
	return requireGuestForEvent(
		await resolveRequestActor(request, undefined, eventId),
		eventId,
	);
}
