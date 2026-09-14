import { describe, expect, it } from "vitest";
import type {
	AdminAuditEntry,
	AdminEvent,
	AdminGift,
	AdminGuest,
	UpdateEventResult,
} from "./admin";

const adminEvent: AdminEvent = {
	id: "event-1",
	slug: "baby-shower",
	title: "Baby shower",
	eventType: "baby_shower",
	honoreeNames: ["Marta", "Luis"],
	details: {
		type: "baby_shower",
		dueDate: "2026-11-20",
		babySex: null,
	},
	startsAt: "2026-10-20T10:00:00.000Z",
	timezone: "Europe/Madrid",
	venueName: null,
	venueAddress: null,
	venueMapUrl: null,
	description: null,
	maxCompanions: 2,
	giftRegistryEnabled: true,
	rsvpDeadline: null,
	status: "published",
	updatedAt: "2026-08-25T09:00:00.000Z",
};

// Structural counterpart to public.test.ts: the owner/editor DTO must be
// ABLE to carry the reserving guest's identity (spec: Reservation
// Visibility Asymmetry; design Testing Strategy: "owner/editor DTO
// includes reserver identity"). PublicGift structurally cannot; AdminGift
// can.
describe("AdminGift (design D9 structural counterpart to PublicGift)", () => {
	it("carries the reserving guest's identity when reserved", () => {
		const gift: AdminGift = {
			id: "gift-2",
			title: "High chair",
			description: null,
			imagePublicId: null,
			url: null,
			status: "reserved",
			reservedBy: { guestId: "guest-9", displayName: "Jordan Rivera" },
		};

		expect("reservedBy" in gift).toBe(true);
		expect(gift.reservedBy?.displayName).toBe("Jordan Rivera");
	});

	it("carries no reserver when unreserved (triangulation)", () => {
		const gift: AdminGift = {
			id: "gift-3",
			title: "Diaper bag",
			description: null,
			imagePublicId: null,
			url: null,
			status: "available",
			reservedBy: null,
		};

		expect(gift.reservedBy).toBeNull();
	});
});

// The rest of the admin surface. These assert the PROPERTIES the seam
// promises, not the field lists — restating a type in a test proves
// nothing the compiler has not already checked.
describe("the admin surface encodes its guarantees structurally", () => {
	it("distinguishes an unanswered guest from an explicit decline", () => {
		const pending: AdminGuest = {
			id: "guest-1",
			displayName: "Ana Ruiz",
			email: null,
			source: "preloaded",
			attending: null,
			companions: 0,
			respondedAt: null,
			hasSharedEmail: false,
		};
		const declined: AdminGuest = { ...pending, attending: false };

		// null means "has not answered", false means "answered no". A UI that
		// collapses these to a boolean would report silence as a refusal.
		expect(pending.attending).toBeNull();
		expect(declined.attending).toBe(false);
		expect(pending.attending === declined.attending).toBe(false);
	});

	it("keeps an audit entry readable after its guest is deleted", () => {
		// actor_guest_id is ON DELETE SET NULL, never CASCADE, so the trail
		// survives an ordinary admin action. The denormalized label is what
		// keeps the orphaned entry meaningful.
		const orphaned: AdminAuditEntry = {
			id: 42,
			actor: { kind: "guest", guestId: null, label: "Ana Ruiz" },
			action: "rsvp.submitted",
			entityType: "guest",
			entityId: "guest-1",
			summary: {},
			occurredAt: "2026-08-25T10:00:00.000Z",
		};

		expect(orphaned.actor.label).toBe("Ana Ruiz");
	});

	it("cannot represent a successful admin write without its result", () => {
		// Same discipline as RsvpResult: the ok branch always carries a value,
		// so a caller cannot report a write it did not make.
		const ok: UpdateEventResult = {
			ok: true,
			value: { event: adminEvent },
		};
		const failed: UpdateEventResult = {
			ok: false,
			error: { code: "owner_only" },
		};

		expect(ok.ok && "value" in ok).toBe(true);
		expect(failed.ok === false && "value" in failed).toBe(false);
	});

	it("puts dates on the wire as ISO-8601 strings, never Date objects", () => {
		// design D9: no Date crosses the seam, so serialization cannot differ
		// between the loader and a client-side re-render.
		expect(typeof adminEvent.startsAt).toBe("string");
		expect(new Date(adminEvent.startsAt).toISOString()).toBe(
			adminEvent.startsAt,
		);
	});
});
