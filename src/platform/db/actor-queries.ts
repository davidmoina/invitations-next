import "server-only";

import { and, eq } from "drizzle-orm";

import type { EventId, EventRole } from "#/audit/actor";
import { readOnly } from "#/platform/db/client";
import {
	eventMemberships,
	events,
	guests,
	guestTokens,
} from "#/platform/db/schema/domain";

export type Membership = { role: EventRole } | null;

export type GuestToken = {
	guestId: string;
	eventId: EventId;
	revokedAt: Date | null;
	expiresAt: Date;
} | null;

/**
 * Read-only lookups backing actor resolution. They live inside the sealed
 * database module so query construction never leaks past `platform/db/**`
 * (design D9 seam guard (b)); callers receive plain rows, never a handle.
 */
export async function findMembership(
	userId: string,
	eventId: EventId,
): Promise<Membership> {
	const [membership] = await readOnly()
		.select({ role: eventMemberships.role })
		.from(eventMemberships)
		.where(
			and(
				eq(eventMemberships.userId, userId),
				eq(eventMemberships.eventId, eventId),
			),
		)
		.limit(1);

	return membership &&
		(membership.role === "owner" || membership.role === "editor")
		? { role: membership.role }
		: null;
}

export async function findGuestToken(tokenHash: string): Promise<GuestToken> {
	const [token] = await readOnly()
		.select({
			guestId: guestTokens.guestId,
			eventId: guestTokens.eventId,
			revokedAt: guestTokens.revokedAt,
			expiresAt: guestTokens.expiresAt,
		})
		.from(guestTokens)
		.innerJoin(
			guests,
			and(
				eq(guestTokens.guestId, guests.id),
				eq(guestTokens.eventId, guests.eventId),
			),
		)
		.where(eq(guestTokens.tokenHash, tokenHash))
		.limit(1);

	return token ? { ...token, eventId: token.eventId as EventId } : null;
}

/** Resolves the immutable event scope before accepting an emailed token. */
export async function findEventIdBySlug(slug: string): Promise<EventId | null> {
	const [event] = await readOnly()
		.select({ id: events.id })
		.from(events)
		.where(eq(events.slug, slug))
		.limit(1);
	return event ? (event.id as EventId) : null;
}

/** Reads the guest's persisted delivery address after an RSVP commits. */
export async function findGuestEmail(
	eventId: EventId,
	guestId: string,
): Promise<string | null> {
	const [guest] = await readOnly()
		.select({ email: guests.email })
		.from(guests)
		.where(and(eq(guests.eventId, eventId), eq(guests.id, guestId)))
		.limit(1);
	return guest?.email ?? null;
}
