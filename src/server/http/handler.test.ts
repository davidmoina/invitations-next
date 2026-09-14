import { afterEach, describe, expect, test, vi } from "vitest";

import { AccessError } from "#/server/access-error";

import { handleRoute } from "./handler";

describe("handleRoute", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	test("logs an unexpected failure with the request it broke before answering 500", async () => {
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		const failure = new Error('relation "memberships" does not exist');
		const request = new Request("https://example.test/api/session?x=1");

		const response = await handleRoute(request, async () => {
			throw failure;
		});

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ code: "internal_error" });
		expect(consoleError).toHaveBeenCalledOnce();
		expect(consoleError).toHaveBeenCalledWith(
			"Unhandled error in GET /api/session",
			failure,
		);
	});

	test("keeps expected access failures out of the error log", async () => {
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		const request = new Request("https://example.test/api/session");

		const response = await handleRoute(request, async () => {
			throw new AccessError("unauthorized");
		});

		expect(response.status).toBe(401);
		expect(consoleError).not.toHaveBeenCalled();
	});
});
