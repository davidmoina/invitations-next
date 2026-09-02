/**
 * FROZEN — src/server/contracts/**. See errors.ts for the freeze protocol.
 *
 * Guest-facing (public) shapes. Two properties are structural, not
 * conventions, and are exercised in public.test.ts:
 *
 * 1. `PublicGift` omits the reserver's identity STRUCTURALLY — the key
 *    does not exist on the type, it is not optional and not `undefined`.
 * 2. `RsvpResult` cannot represent success without the persisted row: the
 *    `ok: true` branch always carries `stored`, so there is no way to
 *    construct a success value that did not actually write anything.
 */

import type { PublicError } from "./errors";
import type { EventType } from "./event-types";

/** Guest-facing gift. The reserver's identity is STRUCTURALLY ABSENT —
 *  not optional, not undefined: the key does not exist on this type. */
export type PublicGift = {
	id: string;
	title: string;
	description: string | null;
	imagePublicId: string | null;
	url: string | null;
	status: "available" | "reserved";
	reservedByMe: boolean;
};

/** Guest-safe type-specific details. Private baby sex and birthday age are
 * structurally absent from every branch. */
export type PublicEventDetails =
	| { type: "wedding" }
	| { type: "baby_shower"; dueDate: string }
	| { type: "birthday" }
	| { type: "other" };

export type PublicEventPageData = {
	event: {
		id: string;
		slug: string;
		title: string;
		eventType: EventType;
		honoreeNames: string[];
		details: PublicEventDetails;
		startsAt: string;
		timezone: string;
		venueName: string | null;
		venueMapUrl: string | null;
		description: string | null;
		maxCompanions: number;
		giftRegistryEnabled: boolean;
		rsvpDeadline: string | null;
	};
	guest: {
		id: string;
		displayName: string;
		attending: boolean | null;
		companions: number;
	} | null;
	gifts: PublicGift[];
	media: Array<{
		id: string;
		imagePublicId: string;
		alt: string | null;
		urls: Record<"thumb" | "card" | "full", string>;
	}>;
};

/** Success cannot be represented without the persisted row.
 *  This makes the legacy "success toast with no write" bug untypable. */
export type RsvpResult =
	| {
			ok: true;
			stored: { attending: boolean; companions: number; respondedAt: string };
	  }
	| { ok: false; error: PublicError };

export type ReserveGiftResult =
	| { ok: true; giftId: string }
	| { ok: false; error: PublicError };

export type RegisterGuestInput = {
	displayName: string;
	email: string | null;
};

/** A registration response is content-identical whether the email was
 *  already known or not — the same shape, the same fields, no oracle.
 *  The success branch intentionally carries no guest identity; the caller
 *  loads the authenticated guest from the secure cookie via the route loader. */
export type RegisterGuestResult =
	| { ok: true }
	| { ok: false; error: PublicError };

/** Agent B implements a component with EXACTLY this prop type.
 *  Claude's loader returns exactly PublicEventPageData.
 *  A drift on either side is a compile error, not a runtime surprise. */
export type PublicEventPageProps = PublicEventPageData & {
	onSubmitRsvp: (input: {
		attending: boolean;
		companions: number;
	}) => Promise<RsvpResult>;
	onReserveGift: (input: { giftId: string }) => Promise<ReserveGiftResult>;
	onCancelReservation: (input: {
		giftId: string;
	}) => Promise<ReserveGiftResult>;
	onSubmitMessage: (input: { body: string }) => Promise<{ ok: boolean }>;
};
