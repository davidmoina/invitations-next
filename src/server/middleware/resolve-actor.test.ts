import { createHash } from "node:crypto";

import { describe, expect, test } from "vitest";

import type { EventId } from "#/audit/actor";

import { resolveActor, resolveRequestActor } from "./resolve-actor";

const eventId = "00000000-0000-0000-0000-000000000001" as EventId;
const validToken = "fTzMBPi6qSEK-NqMS_jWqZFA93gnA7caP6RduMSKtk0";
const validHash = createHash("sha256").update(validToken).digest("hex");

function dependencies(
	overrides: Partial<Parameters<typeof resolveActor>[1]> = {},
) {
	return {
		getSession: async () => null,
		findMembership: async () => null,
		findGuestToken: async (tokenHash: string) =>
			tokenHash === validHash
				? {
						guestId: "00000000-0000-0000-0000-000000000002",
						eventId,
						revokedAt: null,
						expiresAt: new Date("2030-01-01T00:00:00.000Z"),
					}
				: null,
		now: () => new Date("2029-01-01T00:00:00.000Z"),
		...overrides,
	};
}

describe("resolveActor", () => {
	test("binds an organizer to the explicitly checked membership", async () => {
		await expect(
			resolveActor(
				eventId,
				dependencies({
					getSession: async () => ({ user: { id: "organizer-1" } }),
					findMembership: async () => ({ role: "editor" }),
				}),
			),
		).resolves.toEqual({
			kind: "organizer",
			userId: "organizer-1",
			eventId,
			role: "editor",
		});
	});

	test("denies a guest token scoped to another event", async () => {
		await expect(
			resolveActor(
				"00000000-0000-0000-0000-0000000000ff" as EventId,
				dependencies(),
				validToken,
			),
		).resolves.toBeNull();
	});
});

describe("resolveRequestActor", () => {
	test("reads a guest token from the request cookie", async () => {
		const request = new Request("https://app.test/e/event", {
			headers: { cookie: `__Host-guest_token=${validToken}` },
		});

		await expect(resolveRequestActor(request, dependencies())).resolves.toEqual(
			{
				kind: "guest",
				guestId: "00000000-0000-0000-0000-000000000002",
				eventId,
			},
		);
	});
});
