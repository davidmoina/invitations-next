import { z } from "zod";

import type { EventDetails } from "#/server/contracts/admin";
import type { BabySex } from "#/server/contracts/event-types";
import { BABY_SEXES } from "#/server/contracts/event-types";

export type CompanionCapResult =
	| { ok: true; companions: number }
	| { ok: false; maxCompanions: number };

/** Applies the event cap read inside the RSVP transaction, never client state. */
export const eventDetailsInput = z.discriminatedUnion("type", [
	z.object({ type: z.literal("wedding") }).strict(),
	z
		.object({
			type: z.literal("baby_shower"),
			dueDate: z.iso.date(),
			babySex: z.enum(BABY_SEXES).nullable(),
		})
		.strict(),
	z
		.object({
			type: z.literal("birthday"),
			turningAge: z.number().int().nullable(),
		})
		.strict(),
	z.object({ type: z.literal("other") }).strict(),
]);

export function evaluateCompanionCap(
	maxCompanions: number,
	companions: number,
): CompanionCapResult {
	if (
		!Number.isInteger(companions) ||
		companions < 0 ||
		companions > maxCompanions
	) {
		return { ok: false, maxCompanions };
	}
	return { ok: true, companions };
}

/**
 * Produces the complete database tail for an event type.
 *
 * Every key is present so Drizzle emits nulls for stale fields on a type
 * change instead of preserving data that no longer belongs to that type.
 */
export function normalizeEventDetails(details: EventDetails): {
	dueDate: string | null;
	babySex: BabySex | null;
	turningAge: number | null;
} {
	switch (details.type) {
		case "wedding":
		case "other":
			return { dueDate: null, babySex: null, turningAge: null };
		case "baby_shower":
			return {
				dueDate: details.dueDate,
				babySex: details.babySex,
				turningAge: null,
			};
		case "birthday":
			return {
				dueDate: null,
				babySex: null,
				turningAge: details.turningAge,
			};
	}
}
