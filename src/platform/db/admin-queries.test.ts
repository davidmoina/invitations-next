import { describe, expect, it } from "vitest";

import {
	toAdminAuditActor,
	toAdminEventDetails,
	toAdminGift,
	toAdminGuest,
} from "./admin-queries";

describe("admin query mappers", () => {
	it("maps an active reservation to the organizer-only gift identity", () => {
		expect(
			toAdminGift({
				id: "gift-1",
				title: "Crib",
				description: null,
				imagePublicId: null,
				url: null,
				reservingGuestId: "guest-1",
				reservingGuestName: "Marta",
			}),
		).toMatchObject({
			status: "reserved",
			reservedBy: { guestId: "guest-1", displayName: "Marta" },
		});
	});

	it("keeps an unreserved gift identity-free", () => {
		expect(
			toAdminGift({
				id: "gift-2",
				title: "Books",
				description: "A library",
				imagePublicId: "gift/books",
				url: "https://example.test/books",
				reservingGuestId: null,
				reservingGuestName: null,
			}),
		).toMatchObject({ status: "available", reservedBy: null });
	});

	it("serializes guest and audit dates across the server contract seam", () => {
		const respondedAt = new Date("2026-09-10T08:00:00.000Z");
		const occurredAt = new Date("2026-09-11T09:00:00.000Z");

		expect(
			toAdminGuest({
				id: "guest-1",
				displayName: "Ana",
				email: "ana@example.test",
				source: "public_link",
				attending: true,
				companions: 2,
				respondedAt,
				hasSharedEmail: true,
			}),
		).toMatchObject({ respondedAt: respondedAt.toISOString() });
		expect(
			toAdminAuditActor({ kind: "guest", guestId: "guest-1", label: "Ana" }),
		).toEqual({ kind: "guest", guestId: "guest-1", label: "Ana" });
		expect(occurredAt.toISOString()).toBe("2026-09-11T09:00:00.000Z");
	});

	it.each([
		["wedding", null, null, null],
		["baby_shower", "2030-01-01", null, null],
		["baby_shower", "2030-01-01", "boy", null],
		["birthday", null, null, null],
		["birthday", null, null, 18],
		["other", null, null, null],
	] as const)("maps %s event details", (eventType, dueDate, babySex, turningAge) => {
		const details = toAdminEventDetails({
			eventType,
			dueDate,
			babySex,
			turningAge,
		});

		expect(details.type).toBe(eventType);
		if (details.type === "baby_shower") {
			expect(details).toMatchObject({ dueDate, babySex });
		}
		if (details.type === "birthday") {
			expect(details).toMatchObject({ turningAge });
		}
	});
});
