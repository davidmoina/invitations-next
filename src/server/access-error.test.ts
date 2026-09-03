import { describe, expect, it } from "vitest";

import { AccessError, accessErrorCode } from "./access-error";

describe("AccessError", () => {
	it("carries its code as both the error code and the message", () => {
		const error = new AccessError("forbidden");

		expect(error.code).toBe("forbidden");
		expect(error.message).toBe("forbidden");
		expect(error.name).toBe("AccessError");
	});
});

describe("accessErrorCode", () => {
	it("reads the code from an access error", () => {
		expect(accessErrorCode(new AccessError("not_found"))).toBe("not_found");
		expect(accessErrorCode(new AccessError("unauthorized"))).toBe(
			"unauthorized",
		);
		expect(accessErrorCode(new AccessError("forbidden"))).toBe("forbidden");
		expect(accessErrorCode(new AccessError("conflict"))).toBe("conflict");
	});

	// PORT GAP (STACK.md §7.0) — the TanStack version asserted that an
	// AccessError survives Seroval, which rebuilt it as a plain `Error` and
	// made `instanceof` false on the far side. Under Route Handlers the wire
	// format is ours: `AccessError.code` → HTTP status + `{ code }` body. The
	// replacement assertion is an explicit encode/decode round trip and is
	// owned by `src/server/http/**`, which does not exist yet.

	it("returns null for unrelated errors and non-errors", () => {
		expect(accessErrorCode(new Error("boom"))).toBeNull();
		expect(
			accessErrorCode(new AccessError("not_found" as never)),
		).not.toBeNull();
		expect(accessErrorCode({ name: "AccessError", code: "nope" })).toBeNull();
		expect(accessErrorCode(null)).toBeNull();
		expect(accessErrorCode("not_found")).toBeNull();
		expect(accessErrorCode(undefined)).toBeNull();
	});
});
