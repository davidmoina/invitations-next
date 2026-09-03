import "server-only";

import { and, eq, isNull } from "drizzle-orm";

import type { Actor, AuditedTx, EventId, MutationOutcome } from "#/audit/actor";
import { readOnly, withActor } from "#/platform/db/client";
import {
	eventMedia,
	eventMemberships,
	events,
	giftReservations,
	gifts,
	guestMessages,
	guests,
	guestTokens,
} from "#/platform/db/schema/domain";

export function runMutation<T>(
	actor: Actor,
	run: (tx: AuditedTx, actor: Actor) => Promise<MutationOutcome<T>>,
): Promise<T> {
	return withActor(actor, run);
}

export async function getEventCap(
	tx: AuditedTx,
	eventId: string,
): Promise<number | null> {
	const [event] = await tx
		.select({ maxCompanions: events.maxCompanions })
		.from(events)
		.where(eq(events.id, eventId))
		.limit(1);
	return event?.maxCompanions ?? null;
}

export async function upsertGuestRsvp(
	tx: AuditedTx,
	input: {
		eventId: string;
		guestId: string;
		attending: boolean;
		companions: number;
	},
) {
	const [guest] = await tx
		.update(guests)
		.set({
			attending: input.attending,
			companions: input.companions,
			respondedAt: new Date(),
		})
		.where(and(eq(guests.id, input.guestId), eq(guests.eventId, input.eventId)))
		.returning({
			attending: guests.attending,
			companions: guests.companions,
			respondedAt: guests.respondedAt,
		});
	return guest ?? null;
}

export async function insertGuests(
	tx: AuditedTx,
	input: Array<{
		eventId: string;
		displayName: string;
		nameNormalized: string;
		email: string | null;
		emailNormalized: string | null;
		phone: string | null;
		phoneNormalized: string | null;
		source: "public_link" | "preloaded";
	}>,
) {
	return tx.insert(guests).values(input).returning({
		id: guests.id,
		eventId: guests.eventId,
		displayName: guests.displayName,
		email: guests.email,
	});
}

/**
 * Inserts a single public-link guest, silently reconciling when the same
 * normalized identity already exists. The unique constraint on
 * (event_id, email_normalized, name_normalized) makes this safe under
 * concurrent inserts: a conflicting row returns `null` without throwing,
 * and the caller queries the existing record.
 */
export async function insertPublicGuest(
	tx: AuditedTx,
	input: {
		eventId: string;
		displayName: string;
		nameNormalized: string;
		email: string | null;
		emailNormalized: string | null;
		source: "public_link";
	},
) {
	const [guest] = await tx
		.insert(guests)
		.values(input)
		.onConflictDoNothing({
			target: [guests.eventId, guests.emailNormalized, guests.nameNormalized],
		})
		.returning({ id: guests.id });
	return guest ?? null;
}

export async function getEventStartsAt(tx: AuditedTx, eventId: string) {
	const [event] = await tx
		.select({ startsAt: events.startsAt })
		.from(events)
		.where(eq(events.id, eventId))
		.limit(1);
	return event?.startsAt ?? null;
}

export async function insertGuestTokenRow(
	tx: AuditedTx,
	input: {
		guestId: string;
		eventId: string;
		tokenHash: string;
		expiresAt: Date;
	},
) {
	const [token] = await tx
		.insert(guestTokens)
		.values(input)
		.returning({ guestId: guestTokens.guestId });
	return token ?? null;
}

export async function getEventSlug(eventId: string) {
	const [event] = await readOnly()
		.select({ slug: events.slug })
		.from(events)
		.where(eq(events.id, eventId))
		.limit(1);
	return event?.slug ?? null;
}

export async function findGuestByIdentity(
	tx: AuditedTx,
	eventId: string,
	emailNormalized: string | null,
	nameNormalized: string,
) {
	if (emailNormalized === null) return null;
	const [guest] = await tx
		.select()
		.from(guests)
		.where(
			and(
				eq(guests.eventId, eventId),
				eq(guests.emailNormalized, emailNormalized),
				eq(guests.nameNormalized, nameNormalized),
			),
		)
		.limit(1);
	return guest ?? null;
}

/**
 * Resolves a guest from the contact they typed at the access gate. The row
 * never leaves this module: callers receive the delivery address alone, so
 * a lookup can drive an email without exposing whether it matched.
 */
export async function findGuestByContact(
	tx: AuditedTx,
	eventId: string,
	contact: { kind: "email" | "phone"; value: string },
) {
	const column =
		contact.kind === "email" ? guests.emailNormalized : guests.phoneNormalized;
	const [guest] = await tx
		.select({ id: guests.id, email: guests.email })
		.from(guests)
		.where(and(eq(guests.eventId, eventId), eq(column, contact.value)))
		.limit(1);
	return guest ?? null;
}

/**
 * Retires every live credential for one guest. Tokens are stored hashed and
 * the plaintext is shown once, so re-issuing a link must invalidate the
 * previous one rather than leave two working copies in circulation.
 */
export async function revokeGuestTokensFor(
	tx: AuditedTx,
	eventId: string,
	guestId: string,
	revokedAt: Date,
) {
	await tx
		.update(guestTokens)
		.set({ revokedAt })
		.where(
			and(
				eq(guestTokens.eventId, eventId),
				eq(guestTokens.guestId, guestId),
				isNull(guestTokens.revokedAt),
			),
		);
}

export async function reserveGiftRow(
	tx: AuditedTx,
	input: { eventId: string; giftId: string; guestId: string },
) {
	return tx
		.insert(giftReservations)
		.values(input)
		.onConflictDoNothing()
		.returning({ id: giftReservations.id });
}

export async function cancelGiftReservation(
	tx: AuditedTx,
	eventId: string,
	giftId: string,
	guestId: string | null,
) {
	const conditions = [
		eq(giftReservations.eventId, eventId),
		eq(giftReservations.giftId, giftId),
		isNull(giftReservations.cancelledAt),
	];
	if (guestId) conditions.push(eq(giftReservations.guestId, guestId));
	const [reservation] = await tx
		.update(giftReservations)
		.set({
			cancelledAt: new Date(),
			cancelledByKind: guestId ? "guest" : "organizer",
		})
		.where(and(...conditions))
		.returning({ id: giftReservations.id });
	return reservation ?? null;
}

export async function transferOwnerRows(
	tx: AuditedTx,
	eventId: string,
	previousOwnerId: string,
	nextOwnerId: string,
) {
	await tx
		.update(eventMemberships)
		.set({ role: "editor" })
		.where(
			and(
				eq(eventMemberships.eventId, eventId),
				eq(eventMemberships.userId, previousOwnerId),
				eq(eventMemberships.role, "owner"),
			),
		);
	const [owner] = await tx
		.update(eventMemberships)
		.set({ role: "owner" })
		.where(
			and(
				eq(eventMemberships.eventId, eventId),
				eq(eventMemberships.userId, nextOwnerId),
			),
		)
		.returning({ userId: eventMemberships.userId });
	return owner ?? null;
}

export async function insertGuestMessage(
	tx: AuditedTx,
	input: { eventId: string; guestId: string; body: string },
) {
	const [message] = await tx
		.insert(guestMessages)
		.values(input)
		.returning({ id: guestMessages.id });
	return message ?? null;
}

export async function listMessagesForEvent(eventId: string) {
	return readOnly()
		.select({
			id: guestMessages.id,
			guestId: guestMessages.guestId,
			body: guestMessages.body,
			createdAt: guestMessages.createdAt,
		})
		.from(guestMessages)
		.where(eq(guestMessages.eventId, eventId));
}

export async function giftExistsOnEvent(
	tx: AuditedTx,
	eventId: string,
	giftId: string,
) {
	const [gift] = await tx
		.select({ id: gifts.id })
		.from(gifts)
		.where(and(eq(gifts.id, giftId), eq(gifts.eventId, eventId)))
		.limit(1);
	return gift ?? null;
}

export async function isGiftRegistryEnabled(tx: AuditedTx, eventId: string) {
	const [event] = await tx
		.select({ giftRegistryEnabled: events.giftRegistryEnabled })
		.from(events)
		.where(eq(events.id, eventId))
		.limit(1);
	return event?.giftRegistryEnabled ?? false;
}

export type EventScopedActor = Extract<Actor, { eventId: EventId }>;

export async function recordEmailDeliveryFailure(
	actor: Actor,
	entityId: string,
) {
	return runMutation(actor, async () => ({
		value: undefined,
		events: [
			{
				action: "email_delivery_failed",
				entityType: "email",
				entityId,
				eventId: actor.kind === "system" ? null : actor.eventId,
			},
		],
	}));
}

export async function insertEventMedia(
	tx: AuditedTx,
	input: {
		eventId: string;
		imagePublicId: string;
		width: number;
		height: number;
		alt: string;
		position: number;
	},
) {
	const [media] = await tx.insert(eventMedia).values(input).returning({
		id: eventMedia.id,
		imagePublicId: eventMedia.imagePublicId,
		width: eventMedia.width,
		height: eventMedia.height,
	});
	return media ?? null;
}

export async function deleteEventMedia(
	tx: AuditedTx,
	eventId: string,
	mediaId: string,
) {
	const [media] = await tx
		.delete(eventMedia)
		.where(and(eq(eventMedia.id, mediaId), eq(eventMedia.eventId, eventId)))
		.returning({ id: eventMedia.id, imagePublicId: eventMedia.imagePublicId });
	return media ?? null;
}
