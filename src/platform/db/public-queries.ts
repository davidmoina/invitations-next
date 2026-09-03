import "server-only";

import { and, asc, eq, isNull } from "drizzle-orm";

import type { Actor } from "#/audit/actor";
import { toPublicDto } from "#/gifts/rules";
import type { ImageStorage } from "#/media/ports/image-storage";
import { galleryImage } from "#/media/use-cases";
import { readOnly } from "#/platform/db/client";
import {
	eventMedia,
	events,
	giftReservations,
	gifts,
	guests,
} from "#/platform/db/schema/domain";
import { AccessError } from "#/server/access-error";
import { EVENT_TYPES } from "#/server/contracts/event-types";
import type { PublicEventPageData } from "#/server/contracts/public";

function isEventType(
	value: string,
): value is PublicEventPageData["event"]["eventType"] {
	return EVENT_TYPES.some((eventType) => eventType === value);
}

/** Maps persisted fields to the guest-safe details contract. */
export function toPublicEventDetails(row: {
	eventType: string;
	dueDate: string | null;
}): PublicEventPageData["event"]["details"] {
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
			return { type: "baby_shower", dueDate: row.dueDate };
		case "birthday":
			return { type: "birthday" };
		case "other":
			return { type: "other" };
	}
}

/**
 * Builds the guest-facing page for a slug. `actor` is nullable because the
 * public invitation is readable by anyone holding the link: an anonymous
 * visitor simply has no guest identity to project, so no guest row is read
 * and every gift renders as `reservedByMe: false`.
 */
export async function getPublicEventData(
	slug: string,
	actor: Actor | null,
	storage: ImageStorage,
): Promise<PublicEventPageData> {
	const [event] = await readOnly()
		.select({
			id: events.id,
			slug: events.slug,
			title: events.title,
			eventType: events.eventType,
			honoreeNames: events.honoreeNames,
			dueDate: events.dueDate,
			startsAt: events.startsAt,
			timezone: events.timezone,
			venueName: events.venueName,
			venueMapUrl: events.venueMapUrl,
			description: events.description,
			maxCompanions: events.maxCompanions,
			giftRegistryEnabled: events.giftRegistryEnabled,
			rsvpDeadline: events.rsvpDeadline,
		})
		.from(events)
		.where(eq(events.slug, slug))
		.limit(1);
	if (!event) throw new AccessError("not_found");
	const details = toPublicEventDetails({
		eventType: event.eventType,
		dueDate: event.dueDate,
	});
	const guestId =
		actor?.kind === "guest" && actor.eventId === event.id
			? actor.guestId
			: null;
	const [guest] = guestId
		? await readOnly()
				.select({
					id: guests.id,
					displayName: guests.displayName,
					attending: guests.attending,
					companions: guests.companions,
				})
				.from(guests)
				.where(and(eq(guests.id, guestId), eq(guests.eventId, event.id)))
				.limit(1)
		: [];
	const giftRows = event.giftRegistryEnabled
		? await readOnly()
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
						eq(giftReservations.eventId, event.id),
						isNull(giftReservations.cancelledAt),
					),
				)
				.leftJoin(guests, eq(guests.id, giftReservations.guestId))
				.where(eq(gifts.eventId, event.id))
				.orderBy(asc(gifts.position))
		: [];
	const mediaRows = await readOnly()
		.select({
			id: eventMedia.id,
			imagePublicId: eventMedia.imagePublicId,
			width: eventMedia.width,
			height: eventMedia.height,
			alt: eventMedia.alt,
		})
		.from(eventMedia)
		.where(eq(eventMedia.eventId, event.id))
		.orderBy(asc(eventMedia.position));
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
			venueMapUrl: event.venueMapUrl,
			description: event.description,
			maxCompanions: event.maxCompanions,
			giftRegistryEnabled: event.giftRegistryEnabled,
			rsvpDeadline: event.rsvpDeadline?.toISOString() ?? null,
		},
		guest: guest
			? {
					id: guest.id,
					displayName: guest.displayName,
					attending: guest.attending,
					companions: guest.companions,
				}
			: null,
		gifts: giftRows.map((gift) =>
			toPublicDto(
				{
					id: gift.id,
					title: gift.title,
					description: gift.description,
					imagePublicId: gift.imagePublicId,
					url: gift.url,
					reservation:
						gift.reservingGuestId && gift.reservingGuestName
							? {
									guestId: gift.reservingGuestId,
									displayName: gift.reservingGuestName,
								}
							: null,
				},
				guestId,
			),
		),
		media: mediaRows.map((media) => ({
			id: media.id,
			imagePublicId: media.imagePublicId,
			alt: media.alt,
			urls: galleryImage(storage, {
				publicId: media.imagePublicId,
				width: media.width,
				height: media.height,
				bytes: 0,
			}).urls,
		})),
	};
}
