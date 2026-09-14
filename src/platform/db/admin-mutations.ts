import "server-only";

import { and, eq } from "drizzle-orm";

import type { AuditedTx } from "#/audit/actor";
import type { BabySex, EventType } from "#/server/contracts/event-types";
import { user } from "./schema/auth";
import { eventMemberships, events, gifts, guests } from "./schema/domain";

export async function archiveEventRow(tx: AuditedTx, eventId: string) {
	const [event] = await tx
		.update(events)
		.set({ status: "archived", updatedAt: new Date() })
		.where(eq(events.id, eventId))
		.returning({ id: events.id, status: events.status });
	return event ?? null;
}

export async function updateGiftRow(
	tx: AuditedTx,
	eventId: string,
	giftId: string,
	input: Partial<{
		title: string;
		description: string | null;
		url: string | null;
		imagePublicId: string | null;
		position: number;
	}>,
) {
	const [gift] = await tx
		.update(gifts)
		.set(input)
		.where(and(eq(gifts.id, giftId), eq(gifts.eventId, eventId)))
		.returning();
	return gift ?? null;
}

export async function updateGuestRow(
	tx: AuditedTx,
	eventId: string,
	guestId: string,
	input: Partial<{
		displayName: string;
		nameNormalized: string;
		email: string | null;
		emailNormalized: string | null;
		phone: string | null;
		phoneNormalized: string | null;
		source: "public_link" | "preloaded";
		attending: boolean | null;
		companions: number;
		respondedAt: Date | null;
	}>,
) {
	const [guest] = await tx
		.update(guests)
		.set(input)
		.where(and(eq(guests.id, guestId), eq(guests.eventId, eventId)))
		.returning();
	return guest ?? null;
}

export async function insertGiftRow(
	tx: AuditedTx,
	input: {
		eventId: string;
		title: string;
		description: string | null;
		url: string | null;
		imagePublicId: string | null;
		position: number;
	},
) {
	const [gift] = await tx
		.insert(gifts)
		.values(input)
		.returning({ id: gifts.id });
	return gift ?? null;
}

export async function insertEventRow(
	tx: AuditedTx,
	input: {
		id: string;
		slug: string;
		title: string;
		eventType: EventType;
		honoreeNames: string[];
		dueDate: string | null;
		babySex: BabySex | null;
		turningAge: number | null;
		startsAt: Date;
		timezone: string;
		venueName: string | null;
		venueAddress: string | null;
		venueMapUrl: string | null;
		description: string | null;
		maxCompanions: number;
		giftRegistryEnabled: boolean;
		rsvpDeadline: Date | null;
		createdBy: string;
	},
) {
	// A new event is always a draft; publishing is a separate, explicit edit.
	const [event] = await tx
		.insert(events)
		.values({ ...input, status: "draft" })
		.returning({ id: events.id, slug: events.slug });
	return event ?? null;
}

/** Companion to `insertEditorMembership`, for the membership created with the event. */
export async function insertOwnerMembership(
	tx: AuditedTx,
	eventId: string,
	userId: string,
) {
	const [membership] = await tx
		.insert(eventMemberships)
		.values({ eventId, userId, role: "owner" })
		.returning({ userId: eventMemberships.userId });
	return membership ?? null;
}

export async function findEventStatus(tx: AuditedTx, eventId: string) {
	const [row] = await tx
		.select({ status: events.status })
		.from(events)
		.where(eq(events.id, eventId))
		.limit(1);
	return row?.status ?? null;
}

export async function updateEventRow(
	tx: AuditedTx,
	eventId: string,
	input: {
		title: string;
		eventType: EventType;
		honoreeNames: string[];
		dueDate: string | null;
		babySex: BabySex | null;
		turningAge: number | null;
		startsAt: Date;
		timezone: string;
		venueName: string | null;
		venueAddress: string | null;
		venueMapUrl: string | null;
		description: string | null;
		maxCompanions: number;
		giftRegistryEnabled: boolean;
		rsvpDeadline: Date | null;
		status: "draft" | "published" | "archived";
	},
) {
	const [event] = await tx
		.update(events)
		.set({ ...input, updatedAt: new Date() })
		.where(eq(events.id, eventId))
		.returning();
	return event ?? null;
}

export async function findUserByEmail(tx: AuditedTx, email: string) {
	const [member] = await tx
		.select({ id: user.id })
		.from(user)
		.where(eq(user.email, email))
		.limit(1);
	return member ?? null;
}

export async function insertEditorMembership(
	tx: AuditedTx,
	eventId: string,
	userId: string,
) {
	const [membership] = await tx
		.insert(eventMemberships)
		.values({ eventId, userId, role: "editor" })
		.onConflictDoNothing()
		.returning({ userId: eventMemberships.userId });
	return membership ?? null;
}

export async function removeMembershipRow(
	tx: AuditedTx,
	eventId: string,
	userId: string,
) {
	const [membership] = await tx
		.delete(eventMemberships)
		.where(
			and(
				eq(eventMemberships.eventId, eventId),
				eq(eventMemberships.userId, userId),
				eq(eventMemberships.role, "editor"),
			),
		)
		.returning({ userId: eventMemberships.userId });
	return membership ?? null;
}
