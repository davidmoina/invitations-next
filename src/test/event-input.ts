import type { NewEventInput } from "#/server/contracts/admin";

export function eventInput(
	overrides: Partial<NewEventInput> = {},
): NewEventInput {
	return {
		title: "HTTP integration event",
		eventType: "other",
		honoreeNames: [],
		details: { type: "other" },
		startsAt: "2030-01-01T12:00:00.000Z",
		timezone: "UTC",
		venueName: null,
		venueAddress: null,
		venueMapUrl: null,
		description: null,
		maxCompanions: 2,
		giftRegistryEnabled: true,
		rsvpDeadline: null,
		...overrides,
	};
}
