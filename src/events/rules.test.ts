import { describe, expect, test } from "vitest";
import { evaluateCompanionCap, normalizeEventDetails } from "./rules";

describe("evaluateCompanionCap", () => {
	test.each([
		{ max: 3, submitted: 2, accepted: true },
		{ max: 3, submitted: 3, accepted: true },
		{ max: 3, submitted: 4, accepted: false },
		{ max: 0, submitted: 1, accepted: false },
	])("enforces the persisted cap for $submitted companions", ({
		max,
		submitted,
		accepted,
	}) => {
		expect(evaluateCompanionCap(max, submitted).ok).toBe(accepted);
	});
});

describe("normalizeEventDetails", () => {
	test.each([
		{ details: { type: "wedding" } as const },
		{
			details: {
				type: "baby_shower",
				dueDate: "2030-01-01",
				babySex: null,
			} as const,
		},
		{
			details: {
				type: "baby_shower",
				dueDate: "2030-01-01",
				babySex: "girl",
			} as const,
		},
		{ details: { type: "birthday", turningAge: null } as const },
		{ details: { type: "birthday", turningAge: 18 } as const },
		{ details: { type: "other" } as const },
	])("returns all database detail keys for $details.type", ({ details }) => {
		const normalized = normalizeEventDetails(details);

		expect(Object.keys(normalized).sort()).toEqual([
			"babySex",
			"dueDate",
			"turningAge",
		]);
		if (details.type !== "baby_shower") {
			expect(normalized.dueDate).toBeNull();
			expect(normalized.babySex).toBeNull();
		}
		if (details.type !== "birthday") {
			expect(normalized.turningAge).toBeNull();
		}
	});
});
