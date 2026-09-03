import { describe, expect, test } from "vitest";
import {
	classifyContact,
	normalizeEmail,
	normalizeName,
	normalizePhone,
	reconciliationAction,
} from "./rules";

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

describe("guest contact normalization", () => {
	test("keeps only digits and drops separators and the international 00 prefix", () => {
		expect(normalizePhone(" 669 47 73 67 ")).toBe("669477367");
		expect(normalizePhone("+34-669-477-367")).toBe("34669477367");
		expect(normalizePhone("0034669477367")).toBe("34669477367");
	});
	test("classifies an at-sign as email and a digit run as phone", () => {
		expect(classifyContact("  ANA@Example.COM ")).toEqual({
			kind: "email",
			value: "ana@example.com",
		});
		expect(classifyContact("669 477 367")).toEqual({
			kind: "phone",
			value: "669477367",
		});
	});
	test("rejects contacts that are neither a usable email nor a dialable number", () => {
		expect(classifyContact("   ").kind).toBe("invalid");
		expect(classifyContact("Ana María").kind).toBe("invalid");
		expect(classifyContact("@example.com").kind).toBe("invalid");
		expect(classifyContact("12345").kind).toBe("invalid");
		expect(classifyContact("1234567890123456").kind).toBe("invalid");
	});
});
