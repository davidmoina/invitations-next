import { describe, expect, test } from "vitest";

import { clientIpFrom, createFixedWindowRateLimiter } from "./rate-limit";

describe("fixed-window rate limiter", () => {
	test("limits each client IP and slug independently without sleeping", () => {
		let currentTime = 1_000;
		const limiter = createFixedWindowRateLimiter({
			limit: 2,
			windowMs: 60_000,
			now: () => currentTime,
		});

		expect(limiter.allow({ clientIp: "203.0.113.7", slug: "wedding" })).toBe(
			true,
		);
		expect(limiter.allow({ clientIp: "203.0.113.7", slug: "wedding" })).toBe(
			true,
		);
		expect(limiter.allow({ clientIp: "203.0.113.7", slug: "wedding" })).toBe(
			false,
		);
		expect(limiter.allow({ clientIp: "203.0.113.8", slug: "wedding" })).toBe(
			true,
		);
		expect(limiter.allow({ clientIp: "203.0.113.7", slug: "birthday" })).toBe(
			true,
		);

		currentTime += 60_000;
		expect(limiter.allow({ clientIp: "203.0.113.7", slug: "wedding" })).toBe(
			true,
		);
	});

	test("evicts expired windows before adding a new key", () => {
		let currentTime = 1_000;
		const storage = new Map<string, { startsAt: number; count: number }>();
		const limiter = createFixedWindowRateLimiter({
			limit: 1,
			windowMs: 60_000,
			now: () => currentTime,
			storage,
		});

		limiter.allow({ clientIp: "203.0.113.7", slug: "wedding" });
		limiter.allow({ clientIp: "203.0.113.8", slug: "wedding" });
		expect(storage).toHaveLength(2);

		currentTime += 60_000;
		limiter.allow({ clientIp: "203.0.113.9", slug: "wedding" });
		expect(storage).toHaveLength(1);
	});

	test("uses the first forwarded IP and has a stable fallback", () => {
		expect(
			clientIpFrom(
				new Request("https://app.test", {
					headers: { "x-forwarded-for": "203.0.113.7, 10.0.0.1" },
				}),
			),
		).toBe("203.0.113.7");
		expect(clientIpFrom(new Request("https://app.test"))).toBe("unknown");
	});
});
