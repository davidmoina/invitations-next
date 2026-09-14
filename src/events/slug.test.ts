import { describe, expect, it } from "vitest";

import { eventSlug, slugStem } from "#/events/slug";

describe("slugStem", () => {
	it("strips diacritics and lowercases into hyphen-separated words", () => {
		expect(slugStem("Boda de Julián y Sarah")).toBe("boda-de-julian-y-sarah");
	});

	it("collapses punctuation and repeated separators into one hyphen", () => {
		expect(slugStem("Baby   shower  —  ¡Sofía!")).toBe("baby-shower-sofia");
	});

	it("trims leading and trailing separators", () => {
		expect(slugStem("  ***Cumpleaños***  ")).toBe("cumpleanos");
	});

	it("caps the stem so one long title cannot dominate the slug", () => {
		const stem = slugStem("a".repeat(120));

		expect(stem).toHaveLength(60);
	});

	it("never cuts a capped stem on a trailing hyphen", () => {
		// 59 usable characters then a separator: naive slicing would leave "-".
		const stem = slugStem(`${"a".repeat(59)} bcdef`);

		expect(stem.endsWith("-")).toBe(false);
	});

	it("falls back to a constant when a title carries no usable characters", () => {
		expect(slugStem("¿?!!! ***")).toBe("event");
	});
});

describe("eventSlug", () => {
	it("appends a discriminator drawn from the event id", () => {
		expect(eventSlug("Boda", "a1b2c3d4-0000-4000-8000-000000000000")).toBe(
			"boda-a1b2c3d4",
		);
	});

	it("keeps two identically titled events distinct", () => {
		const first = eventSlug(
			"Baby shower",
			"11111111-0000-4000-8000-abcdefabcdef",
		);
		const second = eventSlug(
			"Baby shower",
			"22222222-0000-4000-8000-abcdefabcdef",
		);

		expect(first).not.toBe(second);
	});
});
