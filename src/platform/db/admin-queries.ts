import "server-only";

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";

import type { Actor, UserId } from "#/audit/actor";
import { AccessError } from "#/server/access-error";
import type {
	AdminAuditEntry,
	AdminEvent,
	AdminEventListItem,
	AdminEventPageData,
	AdminGift,
	AdminGuest,
	AdminMembership,
	JsonValue,
} from "#/server/contracts/admin";
import type { BabySex } from "#/server/contracts/event-types";
import { EVENT_TYPES } from "#/server/contracts/event-types";
import { readOnly } from "./client";
import { user } from "./schema/auth";
import {
	auditLog,
	eventMedia,
	eventMemberships,
	events,
	giftReservations,
	gifts,
	guestMessages,
	guests,
} from "./schema/domain";

type AdminGiftRow = {
	id: string;
	title: string;
	description: string | null;
	imagePublicId: string | null;
	url: string | null;
	reservingGuestId: string | null;
	reservingGuestName: string | null;
};

export function toAdminGift(row: AdminGiftRow): AdminGift {
	const reservedBy =
		row.reservingGuestId && row.reservingGuestName
			? { guestId: row.reservingGuestId, displayName: row.reservingGuestName }
			: null;
	return {
		id: row.id,
		title: row.title,
		description: row.description,
		imagePublicId: row.imagePublicId,
		url: row.url,
		status: reservedBy ? "reserved" : "available",
		reservedBy,
	};
}

export function toAdminGuest(row: {
	id: string;
	displayName: string;
	email: string | null;
	source: "public_link" | "preloaded";
	attending: boolean | null;
	companions: number;
	respondedAt: Date | null;
	hasSharedEmail: boolean;
}): AdminGuest {
	return {
		...row,
		respondedAt: row.respondedAt?.toISOString() ?? null,
	};
}

export function toAdminAuditActor(row: {
	kind: "organizer" | "guest" | "system";
	userId?: string | null;
	guestId?: string | null;
	label: string;
}): AdminAuditEntry["actor"] {
	if (row.kind === "organizer")
		return { kind: "organizer", userId: row.userId ?? "", label: row.label };
	if (row.kind === "guest")
		return { kind: "guest", guestId: row.guestId ?? null, label: row.label };
	return { kind: "system", label: row.label };
}

function isEventType(value: string): value is AdminEvent["eventType"] {
	return EVENT_TYPES.some((eventType) => eventType === value);
}

function isBabySex(value: string): value is BabySex {
	return value === "boy" || value === "girl";
}

function toBabySex(value: string | null): BabySex | null {
	if (value === null) return null;
	if (isBabySex(value)) return value;
	throw new Error(`Invalid baby sex in event row: ${value}`);
}

/** Maps persisted, type-scoped fields to the organizer contract. */
export function toAdminEventDetails(row: {
	eventType: string;
	dueDate: string | null;
	babySex: string | null;
	turningAge: number | null;
}): AdminEvent["details"] {
	if (!isEventType(row.eventType)) {
		throw new Error(`Invalid event type in event row: ${row.eventType}`);
	}

	switch (row.eventType) {
		case "wedding":
			return { type: "wedding" };
		case "baby_shower":
			if (row.dueDate === null) {
				throw new Error("Baby shower event row is missing a due date.");
			}
			return {
				type: "baby_shower",
				dueDate: row.dueDate,
				babySex: toBabySex(row.babySex),
			};
		case "birthday":
			return { type: "birthday", turningAge: row.turningAge };
		case "other":
			return { type: "other" };
	}
}

export async function getEventsForOrganizer(
	userId: UserId,
): Promise<AdminEventListItem[]> {
	const rows = await readOnly()
		.select({
			id: events.id,
			slug: events.slug,
			title: events.title,
			startsAt: events.startsAt,
			status: events.status,
			role: eventMemberships.role,
			guestCount: sql<number>`count(${guests.id})::int`,
			attendingCount: sql<number>`count(${guests.id}) filter (where ${guests.attending} is true)::int`,
		})
		.from(eventMemberships)
		.innerJoin(events, eq(events.id, eventMemberships.eventId))
		.leftJoin(guests, eq(guests.eventId, events.id))
		.where(eq(eventMemberships.userId, userId))
		.groupBy(
			events.id,
			events.slug,
			events.title,
			events.startsAt,
			events.status,
			eventMemberships.role,
		)
		.orderBy(desc(events.startsAt));

	return rows.map((row) => ({
		...row,
		startsAt: row.startsAt.toISOString(),
		status: row.status as AdminEventListItem["status"],
		role: row.role as AdminEventListItem["role"],
	}));
}

function organizer(actor: Actor): Extract<Actor, { kind: "organizer" }> {
	if (actor.kind !== "organizer") throw new AccessError("forbidden");
	return actor;
}

export async function getAdminEventPageData(
	actor: Actor,
): Promise<AdminEventPageData> {
	const viewer = organizer(actor);
	const [event] = await readOnly()
		.select()
		.from(events)
		.where(eq(events.id, viewer.eventId))
		.limit(1);
	if (!event) throw new AccessError("not_found");
	const details = toAdminEventDetails({
		eventType: event.eventType,
		dueDate: event.dueDate,
		babySex: event.babySex,
		turningAge: event.turningAge,
	});

	const [guestCountRows, giftCountRows, messageCountRows] = await Promise.all([
		readOnly()
			.select({
				guestCount: sql<number>`count(*)::int`,
				attendingCount: sql<number>`count(*) filter (where ${guests.attending} is true)::int`,
				declinedCount: sql<number>`count(*) filter (where ${guests.attending} is false)::int`,
				totalAttendees: sql<number>`coalesce(sum(case when ${guests.attending} is true then 1 + ${guests.companions} else 0 end), 0)::int`,
			})
			.from(guests)
			.where(eq(guests.eventId, event.id)),
		readOnly()
			.select({
				reserved: sql<number>`count(*) filter (where ${giftReservations.id} is not null)::int`,
				available: sql<number>`count(*) filter (where ${giftReservations.id} is null)::int`,
			})
			.from(gifts)
			.leftJoin(
				giftReservations,
				and(
					eq(giftReservations.giftId, gifts.id),
					isNull(giftReservations.cancelledAt),
				),
			)
			.where(eq(gifts.eventId, event.id)),
		readOnly()
			.select({ count: sql<number>`count(*)::int` })
			.from(guestMessages)
			.where(eq(guestMessages.eventId, event.id)),
	]);
	const guestCounts = guestCountRows[0];
	const giftCounts = giftCountRows[0];
	const messageCounts = messageCountRows[0];

	const [guestRows, giftRows, membershipRows, messageRows, mediaRows] =
		await Promise.all([
			readOnly()
				.select({
					id: guests.id,
					displayName: guests.displayName,
					email: guests.email,
					source: guests.source,
					attending: guests.attending,
					companions: guests.companions,
					respondedAt: guests.respondedAt,
					hasSharedEmail: sql<boolean>`exists (select 1 from ${guests} as shared_guest where shared_guest.event_id = ${event.id} and shared_guest.email_normalized = ${guests.emailNormalized} and shared_guest.id <> ${guests.id})`,
				})
				.from(guests)
				.where(eq(guests.eventId, event.id))
				.orderBy(asc(guests.displayName)),
			readOnly()
				.select({
					id: gifts.id,
					title: gifts.title,
					description: gifts.description,
					imagePublicId: gifts.imagePublicId,
					url: gifts.url,
					reservingGuestId: giftReservations.guestId,
					reservingGuestName: guests.displayName,
				})
				.from(gifts)
				.leftJoin(
					giftReservations,
					and(
						eq(giftReservations.giftId, gifts.id),
						isNull(giftReservations.cancelledAt),
					),
				)
				.leftJoin(guests, eq(guests.id, giftReservations.guestId))
				.where(eq(gifts.eventId, event.id))
				.orderBy(asc(gifts.position)),
			readOnly()
				.select({
					userId: eventMemberships.userId,
					displayName: user.name,
					email: user.email,
					role: eventMemberships.role,
					addedAt: eventMemberships.createdAt,
				})
				.from(eventMemberships)
				.innerJoin(user, eq(user.id, eventMemberships.userId))
				.where(eq(eventMemberships.eventId, event.id))
				.orderBy(asc(eventMemberships.createdAt)),
			readOnly()
				.select({
					id: guestMessages.id,
					guestId: guestMessages.guestId,
					guestDisplayName: guests.displayName,
					body: guestMessages.body,
					createdAt: guestMessages.createdAt,
				})
				.from(guestMessages)
				.innerJoin(guests, eq(guests.id, guestMessages.guestId))
				.where(eq(guestMessages.eventId, event.id))
				.orderBy(desc(guestMessages.createdAt)),
			readOnly()
				.select({
					id: eventMedia.id,
					imagePublicId: eventMedia.imagePublicId,
					alt: eventMedia.alt,
					position: eventMedia.position,
				})
				.from(eventMedia)
				.where(eq(eventMedia.eventId, event.id))
				.orderBy(asc(eventMedia.position)),
		]);

	return {
		event: {
			id: event.id,
			slug: event.slug,
			title: event.title,
			eventType: details.type,
			honoreeNames: event.honoreeNames,
			details,
			startsAt: event.startsAt.toISOString(),
			timezone: event.timezone,
			venueName: event.venueName,
			venueAddress: event.venueAddress,
			venueMapUrl: event.venueMapUrl,
			description: event.description,
			maxCompanions: event.maxCompanions,
			giftRegistryEnabled: event.giftRegistryEnabled,
			rsvpDeadline: event.rsvpDeadline?.toISOString() ?? null,
			status: event.status as "draft" | "published" | "archived",
			updatedAt: event.updatedAt.toISOString(),
		},
		summary: {
			guestCount: guestCounts?.guestCount ?? 0,
			attendingCount: guestCounts?.attendingCount ?? 0,
			declinedCount: guestCounts?.declinedCount ?? 0,
			pendingCount:
				(guestCounts?.guestCount ?? 0) -
				(guestCounts?.attendingCount ?? 0) -
				(guestCounts?.declinedCount ?? 0),
			totalAttendees: guestCounts?.totalAttendees ?? 0,
			giftsReserved: giftCounts?.reserved ?? 0,
			giftsAvailable: giftCounts?.available ?? 0,
			messageCount: messageCounts?.count ?? 0,
		},
		viewerRole: viewer.role,
		guests: guestRows.map((guest) =>
			toAdminGuest({
				...guest,
				source: guest.source as "public_link" | "preloaded",
			}),
		),
		gifts: giftRows.map(toAdminGift),
		memberships: membershipRows.map(
			(membership): AdminMembership => ({
				userId: membership.userId,
				displayName: membership.displayName,
				email: membership.email,
				role: membership.role as "owner" | "editor",
				addedAt: membership.addedAt.toISOString(),
				isCurrentUser: membership.userId === viewer.userId,
			}),
		),
		messages: messageRows.map((message) => ({
			...message,
			createdAt: message.createdAt.toISOString(),
		})),
		media: mediaRows.map((media) => ({
			...media,
			urls: { thumb: "", card: "", full: "" },
		})),
	};
}

export async function listAdminAuditEntries(
	actor: Actor,
): Promise<AdminAuditEntry[]> {
	const viewer = organizer(actor);
	const rows = await readOnly()
		.select()
		.from(auditLog)
		.where(eq(auditLog.eventId, viewer.eventId))
		.orderBy(desc(auditLog.occurredAt));
	return rows.map((entry) => ({
		id: entry.id,
		actor: toAdminAuditActor({
			kind: entry.actorKind as "organizer" | "guest" | "system",
			userId: entry.actorUserId,
			guestId: entry.actorGuestId,
			label: entry.actorLabel,
		}),
		action: entry.action,
		entityType: entry.entityType,
		entityId: entry.entityId,
		summary: entry.summary as Record<string, JsonValue>,
		occurredAt: entry.occurredAt.toISOString(),
	}));
}
