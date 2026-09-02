import { NextRequest } from "next/server";
import { describe, expect, test } from "vitest";

import { proxy } from "../../../proxy";

describe("API proxy", () => {
	test("rejects unsafe cross-origin requests", () => {
		const response = proxy(
			new NextRequest("https://app.test/api/events", {
				method: "POST",
				headers: { origin: "https://attacker.test" },
			}),
		);

		expect(response.status).toBe(403);
	});

	test("allows safe methods without an origin", () => {
		const response = proxy(
			new NextRequest("https://app.test/api/auth/session", { method: "GET" }),
		);

		expect(response.headers.get("x-middleware-next")).toBe("1");
	});
});
