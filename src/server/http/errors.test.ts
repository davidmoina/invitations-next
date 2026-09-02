import { describe, expect, test } from "vitest";

import { AccessError } from "#/server/access-error";

import { accessErrorResponse, decodeAccessError } from "./errors";

describe("AccessError HTTP wire format", () => {
	test("encodes and decodes each access failure through an HTTP response", async () => {
		const response = accessErrorResponse(new AccessError("forbidden"));

		expect(response.status).toBe(403);
		expect(await response.clone().json()).toEqual({ code: "forbidden" });
		await expect(decodeAccessError(response)).resolves.toEqual(
			new AccessError("forbidden"),
		);
	});

	test("maps access codes to their HTTP semantics", () => {
		expect(accessErrorResponse(new AccessError("unauthorized")).status).toBe(
			401,
		);
		expect(accessErrorResponse(new AccessError("not_found")).status).toBe(404);
		expect(accessErrorResponse(new AccessError("conflict")).status).toBe(409);
	});
});
