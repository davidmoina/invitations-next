import { describe, expect, test } from "vitest";
import { normalizeEmail, normalizeName, reconciliationAction } from "./rules";

describe("guest identity normalization", () => {
	test("normalizes email and names across case, accents, and whitespace", () => {
		expect(normalizeEmail("  ANA@Example.COM ")).toBe("ana@example.com");
		expect(normalizeName("  Ána   María ")).toBe("ana maria");
	});
	test("reconciles same identity but creates a distinguishable entry for another name", () => {
		expect(
			reconciliationAction(
				{ email: "ana@example.com", name: "Ana María" },
				{ email: " ANA@example.com ", name: "Ána María" },
			),
		).toBe("reconcile");
		expect(
			reconciliationAction(
				{ email: "ana@example.com", name: "Ana María" },
				{ email: "ana@example.com", name: "Luis" },
			),
		).toBe("create");
	});
});
