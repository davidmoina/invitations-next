import { describe, expect, test } from "vitest";

import { toIso, toLocalInput } from "./event-form-fields";

describe("datetime-local <-> ISO conversions in the event's timezone", () => {
	test("reads the typed wall-clock time in the event timezone (summer offset)", () => {
		expect(toIso("2026-09-20T14:30", "Europe/Madrid")).toBe(
			"2026-09-20T12:30:00.000Z",
		);
	});

	test("reads the typed wall-clock time in the event timezone (winter offset)", () => {
		expect(toIso("2026-12-20T14:30", "Europe/Madrid")).toBe(
			"2026-12-20T13:30:00.000Z",
		);
	});

	test("handles zones behind UTC", () => {
		expect(toIso("2026-09-20T14:30", "America/Mexico_City")).toBe(
			"2026-09-20T20:30:00.000Z",
		);
	});

	test("leaves UTC untouched", () => {
		expect(toIso("2026-09-20T14:30", "UTC")).toBe("2026-09-20T14:30:00.000Z");
	});

	test("shows a stored instant as the wall-clock time of the event timezone", () => {
		expect(toLocalInput("2026-09-20T12:30:00.000Z", "Europe/Madrid")).toBe(
			"2026-09-20T14:30",
		);
		expect(toLocalInput("2026-12-20T13:30:00.000Z", "Europe/Madrid")).toBe(
			"2026-12-20T14:30",
		);
	});

	test("round-trips what the organizer typed", () => {
		const typed = "2026-10-24T18:00";
		const iso = toIso(typed, "Europe/Madrid");
		expect(iso).not.toBeNull();
		expect(toLocalInput(iso, "Europe/Madrid")).toBe(typed);
	});

	test("falls back to UTC when the timezone is unknown", () => {
		expect(toIso("2026-09-20T14:30", "Mars/Olympus")).toBe(
			"2026-09-20T14:30:00.000Z",
		);
		expect(toLocalInput("2026-09-20T14:30:00.000Z", "")).toBe(
			"2026-09-20T14:30",
		);
	});

	test("maps empty or invalid values to the contract's null / empty string", () => {
		expect(toIso("", "Europe/Madrid")).toBeNull();
		expect(toIso("not-a-date", "Europe/Madrid")).toBeNull();
		expect(toLocalInput(null, "Europe/Madrid")).toBe("");
		expect(toLocalInput("garbage", "Europe/Madrid")).toBe("");
	});
});
