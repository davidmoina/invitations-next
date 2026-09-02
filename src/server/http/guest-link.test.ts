import { describe, expect, test } from "vitest";

import type { EventId } from "#/audit/actor";
import { acceptGuestLink } from "./guest-link";

const token = "fTzMBPi6qSEK-NqMS_jWqZFA93gnA7caP6RduMSKtk0";
const eventId = "00000000-0000-0000-0000-000000000001" as EventId;

describe("guest link handshake", () => {
	test("resolves the slug before accepting and setting a token cookie", async () => {
		const calls: string[] = [];
		const response = await acceptGuestLink(
			new Request(`https://app.test/api/guest-link?slug=event&token=${token}`),
			{
				findEventIdBySlug: async (slug) => {
					calls.push(`slug:${slug}`);
					return eventId;
				},
				hashToken: async () => {
					calls.push("hash");
					return "hash";
				},
				findGuestToken: async () => {
					calls.push("token");
					return {
						eventId,
						revokedAt: null,
						expiresAt: new Date("2030-01-01T00:00:00.000Z"),
					};
				},
				now: () => new Date("2029-01-01T00:00:00.000Z"),
			},
		);

		expect(calls).toEqual(["slug:event", "hash", "token"]);
		expect(response.status).toBe(307);
		expect(response.headers.get("location")).toBe("https://app.test/e/event");
		expect(response.headers.get("set-cookie")).toContain("__Host-guest_token=");
	});

	test("does not look up a token for an unknown slug", async () => {
		const response = await acceptGuestLink(
			new Request(
				`https://app.test/api/guest-link?slug=missing&token=${token}`,
			),
			{
				findEventIdBySlug: async () => null,
				hashToken: async () => {
					throw new Error("token must not be accepted without an event");
				},
				findGuestToken: async () => {
					throw new Error("token must not be accepted without an event");
				},
				now: () => new Date(),
			},
		);

		expect(response.status).toBe(307);
		expect(response.headers.get("set-cookie")).toBeNull();
	});
});
