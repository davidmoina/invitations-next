import { z } from "zod";

import { eventDetailsInput } from "#/events/rules";
import { EVENT_TYPES } from "#/server/contracts/event-types";

export const eventIdSchema = z.string().uuid();

export const eventInputFields = {
	title: z.string().trim().min(1),
	eventType: z.enum(EVENT_TYPES),
	honoreeNames: z.array(z.string().trim().min(1)).max(10),
	details: eventDetailsInput,
	startsAt: z.string().datetime(),
	timezone: z.string().trim().min(1),
	venueName: z.string().trim().nullable(),
	venueAddress: z.string().trim().nullable(),
	venueMapUrl: z.url().nullable(),
	description: z.string().trim().nullable(),
	maxCompanions: z.number().int().min(0),
	giftRegistryEnabled: z.boolean(),
	rsvpDeadline: z.string().datetime().nullable(),
	status: z.enum(["draft", "published", "archived"]),
};

function matchingEventDetails(input: {
	eventType: string;
	details: { type: string };
}): boolean {
	return input.eventType === input.details.type;
}

export const createEventSchema = z
	.object({
		title: eventInputFields.title,
		eventType: eventInputFields.eventType,
		honoreeNames: eventInputFields.honoreeNames,
		details: eventInputFields.details,
		startsAt: eventInputFields.startsAt,
		timezone: eventInputFields.timezone,
		venueName: eventInputFields.venueName,
		venueAddress: eventInputFields.venueAddress,
		venueMapUrl: eventInputFields.venueMapUrl,
		description: eventInputFields.description,
		maxCompanions: eventInputFields.maxCompanions,
		giftRegistryEnabled: eventInputFields.giftRegistryEnabled,
		rsvpDeadline: eventInputFields.rsvpDeadline,
	})
	.strict()
	.refine(matchingEventDetails);

export const updateEventSchema = z
	.object(eventInputFields)
	.strict()
	.refine(matchingEventDetails);

export const guestsSchema = z
	.object({
		guests: z
			.array(
				z.object({
					displayName: z.string().trim().min(1),
					email: z.string().email().nullable(),
				}),
			)
			.min(1),
	})
	.strict();

export const createGiftSchema = z
	.object({
		title: z.string().trim().min(1),
		description: z.string().trim().nullable(),
		url: z.url().nullable(),
		imagePublicId: z.string().trim().nullable(),
		position: z.number().int().min(0),
	})
	.strict();

export const editGiftSchema = createGiftSchema.partial().strict();

export const editGuestSchema = z
	.object({
		displayName: z.string().trim().min(1).optional(),
		email: z.string().trim().email().nullable().optional(),
		attending: z.boolean().nullable().optional(),
		companions: z.number().int().min(0).optional(),
	})
	.strict();
