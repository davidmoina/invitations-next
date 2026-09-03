import { describe, expect, test } from "vitest";

import { hasSameOrigin, shouldValidateRequest } from "./csrf";

describe("CSRF policy", () => {
	test("validates unsafe methods", () => {
		expect(shouldValidateRequest("POST")).toBe(true);
		expect(shouldValidateRequest("PATCH")).toBe(true);
		expect(shouldValidateRequest("DELETE")).toBe(true);
	});

	test("accepts only an explicit matching origin for unsafe requests", () => {
		expect(
			hasSameOrigin(
				new Request("https://app.test/api/events", {
					headers: { origin: "https://app.test" },
				}),
			),
		).toBe(true);
		expect(hasSameOrigin(new Request("https://app.test/api/events"))).toBe(
			false,
		);
	});

	test("exempts safe reads and preflight", () => {
		expect(shouldValidateRequest("GET")).toBe(false);
		expect(shouldValidateRequest("HEAD")).toBe(false);
		expect(shouldValidateRequest("OPTIONS")).toBe(false);
	});
});
