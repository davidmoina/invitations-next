import { describe, expect, it } from "vitest";
import type {
	PublicEventPageProps,
	PublicGift,
	RegisterGuestResult,
	RsvpResult,
} from "./public";

// Design D9: PublicGift must structurally omit the reserver's identity —
// not `undefined`, not optional: the key must not exist on the object at
// all. This is what makes "leak the reserver's name to every guest"
// unrepresentable rather than merely forbidden by convention.
describe("PublicGift (design D9 structural omission)", () => {
	it("omits the reserver's identity for an available gift", () => {
		const gift: PublicGift = {
			id: "gift-1",
			title: "Stroller",
			description: null,
			imagePublicId: null,
			url: null,
			status: "available",
			reservedByMe: false,
		};

		expect("reservedBy" in gift).toBe(false);
	});

	it("still omits the reserver's identity for a reserved gift (triangulation)", () => {
		const gift: PublicGift = {
			id: "gift-2",
			title: "High chair",
			description: "Foldable, grey",
			imagePublicId: "img-42",
			url: "https://example.com/high-chair",
			status: "reserved",
			reservedByMe: true,
		};

		expect("reservedBy" in gift).toBe(false);
		expect(gift.status).toBe("reserved");
	});
});

// Design D9: RsvpResult cannot represent success without the persisted
// row — the `ok: true` branch always carries `stored`, so there is no way
// to construct a "success" value that did not actually write anything.
describe("RsvpResult (design D9 write-confirmed feedback)", () => {
	it("carries the persisted row on success", () => {
		const result: RsvpResult = {
			ok: true,
			stored: {
				attending: true,
				companions: 2,
				respondedAt: "2026-08-23T00:00:00.000Z",
			},
		};

		expect(result.ok).toBe(true);
		expect("stored" in result).toBe(true);
		if (result.ok) {
			expect(result.stored.companions).toBe(2);
		}
	});

	it("carries no stored row on failure (triangulation)", () => {
		const result: RsvpResult = {
			ok: false,
			error: { code: "companion_cap_exceeded", maxCompanions: 3 },
		};

		expect(result.ok).toBe(false);
		expect("stored" in result).toBe(false);
	});
});

// Design D9: RegisterGuestResult is content-identical for known and unknown
// emails to prevent an enumeration oracle. The ok branch is a plain boolean
// success marker; the failure branch carries a PublicError — never a plain
// boolean without an error, and never per-guest identity in the success case.
describe("RegisterGuestResult (design D9 generic success, no enumeration oracle)", () => {
	it("carries only ok: true on success", () => {
		const result: RegisterGuestResult = { ok: true };

		expect(result.ok).toBe(true);
		expect("guest" in result).toBe(false);
		expect("error" in result).toBe(false);
	});

	it("carries a PublicError on failure (triangulation)", () => {
		const result: RegisterGuestResult = {
			ok: false,
			error: { code: "unexpected" },
		};

		expect(result.ok).toBe(false);
		expect("guest" in result).toBe(false);
		if (!result.ok) {
			expect(result.error.code).toBe("unexpected");
		}
	});
});

// The route shell (Claude) injects data typed exactly as
// PublicEventPageProps into Agent B's component; a drift on either side
// is a compile error, not a runtime surprise. This test only proves the
// composed prop type is constructible end to end, not any rendering
// behavior (src/ui/** is Agent B's territory, not exercised here).
describe("PublicEventPageProps (design D9 seam shape)", () => {
	it("composes event/guest/gifts/media data with the callback surface", async () => {
		const props: PublicEventPageProps = {
			event: {
				id: "event-1",
				slug: "baby-shower",
				title: "Baby Shower",
				eventType: "baby_shower",
				honoreeNames: ["Marta", "Luis"],
				details: { type: "baby_shower", dueDate: "2026-11-20" },
				startsAt: "2026-09-01T18:00:00.000Z",
				timezone: "America/Mexico_City",
				venueName: null,
				venueMapUrl: null,
				description: null,
				maxCompanions: 3,
				giftRegistryEnabled: true,
				rsvpDeadline: null,
			},
			guest: null,
			gifts: [],
			media: [],
			onSubmitRsvp: async () => ({
				ok: true,
				stored: {
					attending: true,
					companions: 0,
					respondedAt: "2026-08-23T00:00:00.000Z",
				},
			}),
			onReserveGift: async () => ({ ok: true, giftId: "gift-1" }),
			onCancelReservation: async () => ({ ok: true, giftId: "gift-1" }),
			onSubmitMessage: async () => ({ ok: true }),
		};

		const rsvpResult = await props.onSubmitRsvp({
			attending: true,
			companions: 0,
		});
		expect(rsvpResult.ok).toBe(true);
	});
});
