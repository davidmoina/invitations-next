/**
 * FROZEN — src/server/contracts/**. See errors.ts for the freeze protocol.
 *
 * Owner/editor-facing (admin) shapes. Types, literal unions and ISO-8601
 * date strings only: no imports from `platform/`, no Drizzle-inferred
 * types, no `Date` on the wire, no functions with bodies.
 *
 * These are defined up front, as one frozen set, rather than grown as each
 * screen needs them. Additions are cheap under the freeze protocol; a
 * rename or removal is a stop-the-world renegotiation across both
 * workstreams. Defining the whole admin surface once lets the public-UI
 * workstream build against a contract that is not moving underneath it.
 */

import type { BabySex, EventType } from "./event-types";

/** Owner/editor view of a gift. Structural counterpart to PublicGift: the
 *  reserving guest's identity is present here and structurally absent
 *  there (see public.ts). */
export type AdminGift = {
	id: string;
	title: string;
	description: string | null;
	imagePublicId: string | null;
	url: string | null;
	status: "available" | "reserved";
	reservedBy: { guestId: string; displayName: string } | null;
};

/** How a guest entered the event: the public link, or a pre-loaded list. */
export type GuestSource = "public_link" | "preloaded";

/** One row of the organizer's guest list.
 *
 *  `attending` is null when the guest exists but has not answered yet —
 *  distinct from `false`, which is an explicit decline. `email` is null
 *  for a manually added guest with no address, which is why such guests
 *  fall outside email reconciliation and may legitimately duplicate. */
export type AdminGuest = {
	id: string;
	displayName: string;
	email: string | null;
	/** Optional under the additive freeze protocol: rows written before the
	 *  contact column existed have no phone. */
	phone?: string | null;
	source: GuestSource;
	attending: boolean | null;
	companions: number;
	respondedAt: string | null;
	hasSharedEmail: boolean;
};

/** A collaborator on the event. Exactly one member per event is `owner`;
 *  the database enforces that with a partial unique index. */
export type AdminMembership = {
	userId: string;
	displayName: string;
	email: string;
	role: "owner" | "editor";
	addedAt: string;
	isCurrentUser: boolean;
};

/** Who performed an audited action.
 *
 *  `label` is denormalized at write time so the trail stays readable after
 *  the referenced row is gone: deleting a guest sets `guestId` to null
 *  rather than cascading, precisely so their history survives. */
export type AuditActor =
	| { kind: "organizer"; userId: string; label: string }
	| { kind: "guest"; guestId: string | null; label: string }
	| { kind: "system"; label: string };

/** A recursively serializable JSON value for TanStack Start RPC payloads. */
export type JsonValue =
	| string
	| number
	| boolean
	| null
	| JsonValue[]
	| { [key: string]: JsonValue };

/** One immutable audit entry. Append-only: there is no update or delete
 *  path in the repository, and the database revokes both from the app
 *  role. */
export type AdminAuditEntry = {
	id: number;
	actor: AuditActor;
	action: string;
	entityType: string;
	entityId: string;
	summary: Record<string, JsonValue>;
	occurredAt: string;
};

/** A dedication left by a guest. Visible to the organizer only. */
export type AdminMessage = {
	id: string;
	guestId: string;
	guestDisplayName: string;
	body: string;
	createdAt: string;
};

/** One image in the event gallery. Stores a public ID, never a vendor URL,
 *  so changing image host is an adapter swap and not a data migration. */
export type AdminMedia = {
	id: string;
	imagePublicId: string;
	alt: string | null;
	position: number;
	urls: Record<"thumb" | "card" | "full", string>;
};

/** Type-specific organizer details. Kept nested so input Omit operations
 * remain distributive over the flat AdminEvent shape. */
export type EventDetails =
	| { type: "wedding" }
	| { type: "baby_shower"; dueDate: string; babySex: BabySex | null }
	| { type: "birthday"; turningAge: number | null }
	| { type: "other" };

/** The event as its organizers edit it. Carries the draft/published fields
 *  the public payload omits. */
export type AdminEvent = {
	id: string;
	slug: string;
	title: string;
	eventType: EventType;
	honoreeNames: string[];
	details: EventDetails;
	startsAt: string;
	timezone: string;
	venueName: string | null;
	venueAddress: string | null;
	venueMapUrl: string | null;
	description: string | null;
	maxCompanions: number;
	giftRegistryEnabled: boolean;
	rsvpDeadline: string | null;
	status: "draft" | "published" | "archived";
	updatedAt: string;
};

/** What an organizer submits to create an event.
 *
 *  Four fields are creation's own and never the caller's: `id` and `slug` are
 *  derived from the pre-generated event id, `status` always starts as `draft`,
 *  and `updatedAt` is written by the database. */
export type NewEventInput = Omit<
	AdminEvent,
	"id" | "slug" | "status" | "updatedAt"
>;

/** Enough of a freshly created event to navigate to it. */
export type CreatedEvent = { id: string; slug: string };

/** Counts for the organizer's overview. Derived, never stored. */
export type AdminEventSummary = {
	guestCount: number;
	attendingCount: number;
	declinedCount: number;
	pendingCount: number;
	totalAttendees: number;
	giftsReserved: number;
	giftsAvailable: number;
	messageCount: number;
};

/** One row of the organizer's event list. */
export type AdminEventListItem = {
	id: string;
	slug: string;
	title: string;
	startsAt: string;
	status: "draft" | "published" | "archived";
	role: "owner" | "editor";
	guestCount: number;
	attendingCount: number;
};

/** Payload for the admin dashboard of a single event. */
export type AdminEventPageData = {
	event: AdminEvent;
	summary: AdminEventSummary;
	viewerRole: "owner" | "editor";
	guests: AdminGuest[];
	gifts: AdminGift[];
	memberships: AdminMembership[];
	messages: AdminMessage[];
	media: AdminMedia[];
};

/** Errors an organizer-facing flow can report back to the browser. */
export type AdminError =
	| { code: "owner_only" }
	| { code: "not_a_member" }
	| { code: "event_not_found" }
	| { code: "cannot_remove_last_owner" }
	| { code: "member_already_added" }
	| { code: "guest_not_found" }
	| { code: "gift_not_found" }
	| { code: "media_upload_failed" }
	| { code: "unexpected" };

/** Success cannot be represented without the resulting state, the same
 *  discipline `RsvpResult` applies on the public side: a caller cannot
 *  report a successful write it did not actually make. */
export type AdminResult<T> =
	| { ok: true; value: T }
	| { ok: false; error: AdminError };

export type AddGuestsResult = AdminResult<{ added: AdminGuest[] }>;
/** Guest tokens are stored hashed, so the plaintext issued at intake cannot
 *  be read back: showing a link again means minting a new one. */
export type IssueGuestLinkResult = AdminResult<{ url: string }>;
export type TransferOwnershipResult = AdminResult<{
	memberships: AdminMembership[];
}>;
export type UpdateEventResult = AdminResult<{ event: AdminEvent }>;
export type AddMediaResult = AdminResult<{ media: AdminMedia }>;
export type RemoveMediaResult = AdminResult<{ mediaId: string }>;
