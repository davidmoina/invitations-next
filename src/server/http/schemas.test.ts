import { describe, expect, it } from "vitest";

import { eventInput } from "#/test/event-input";
import { createEventSchema, updateEventSchema } from "./schemas";

describe("event WhatsApp message template validation", () => {
	it.each([
		[createEventSchema, {}],
		[updateEventSchema, { status: "draft" as const }],
	])("trims a configured template and normalizes blank text to null", (schema, extra) => {
		expect(
			schema.parse({
				...eventInput({ whatsappMessageTemplate: "  Hola, {nombre}  " }),
				...extra,
			}).whatsappMessageTemplate,
		).toBe("Hola, {nombre}");
		expect(
			schema.parse({
				...eventInput({ whatsappMessageTemplate: "   " }),
				...extra,
			}).whatsappMessageTemplate,
		).toBeNull();
	});

	it("rejects templates longer than 1000 characters", () => {
		expect(() =>
			createEventSchema.parse(
				eventInput({ whatsappMessageTemplate: "a".repeat(1001) }),
			),
		).toThrow();
	});
});
