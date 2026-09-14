import { describe, expect, test } from "vitest";

import { generateGuestToken, hashToken } from "./tokens";

describe("guest tokens", () => {
	test("generates a 43-character base64url secret", () => {
		expect(generateGuestToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
	});

	test("hashes the same token deterministically", async () => {
		const token = "a".repeat(43);
		const [firstHash, secondHash] = await Promise.all([
			hashToken(token),
			hashToken(token),
		]);
		expect(firstHash).toBe(secondHash);
		expect(firstHash).toMatch(/^[a-f0-9]{64}$/);
	});
});
