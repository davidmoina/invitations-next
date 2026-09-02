import { describe, expect, it } from "vitest";

import { toPublicEventDetails } from "./public-queries";

describe("public event query mapper", () => {
	it.each([
		["wedding", null],
		["baby_shower", "2030-01-01"],
		["birthday", null],
		["other", null],
	] as const)("maps %s details without private fields", (eventType, dueDate) => {
		const details = toPublicEventDetails({ eventType, dueDate });

		expect(details.type).toBe(eventType);
		expect("babySex" in details).toBe(false);
		expect("turningAge" in details).toBe(false);
		if (details.type === "baby_shower") {
			expect(details.dueDate).toBe(dueDate);
		}
	});
});
