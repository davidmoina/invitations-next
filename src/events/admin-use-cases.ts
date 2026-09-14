import { can } from "#/accounts/authorization";
import type { Actor, EventId, UserId } from "#/audit/actor";
import { eventDetailsInput, normalizeEventDetails } from "#/events/rules";
import { eventSlug } from "#/events/slug";
import { cancelReservation } from "#/gifts/use-cases";
import {
	archiveEventRow,
	findEventStatus,
	findUserByEmail,
	insertEditorMembership,
	insertEventRow,
	insertOwnerMembership,
	removeMembershipRow,
	updateEventRow,
} from "#/platform/db/admin-mutations";
import { runMutation } from "#/platform/db/domain-mutations";
import { AccessError } from "#/server/access-error";
import type { EventDetails } from "#/server/contracts/admin";
import type { EventType } from "#/server/contracts/event-types";

export type Organizer = Extract<Actor, { kind: "organizer" }>;

function requireOwner(actor: Organizer) {
	if (!can(actor.role, "invite")) throw new AccessError("forbidden");
}

/** Everything about an event except the two fields creation decides itself:
 *  its id (pre-generated, see `newEventActor`) and its `draft` status. */
export type NewEventInput = {
	title: string;
	eventType: EventType;
	honoreeNames: string[];
	details: EventDetails;
	startsAt: string;
	timezone: string;
	venueName: string | null;
	venueAddress: string | null;
	venueMapUrl: string | null;
	description: string | null;
	maxCompanions: number;
	giftRegistryEnabled: boolean;
	rsvpDeadline: string | null;
};

/**
 * The owner actor for an event that does not exist yet.
 *
 * `requireOrganizer(eventId)` resolves an actor from an existing membership,
 * so it cannot apply before the event exists. Generating the id up front
 * instead lets the event row and its owner membership be written under one
 * actor inside one transaction — which is what makes "owner assigned at
 * creation" a same-transaction fact rather than a follow-up write.
 */
export function newEventActor(userId: string): Organizer {
	return {
		kind: "organizer",
		userId: userId as UserId,
		eventId: crypto.randomUUID() as EventId,
		role: "owner",
	};
}

export async function createEvent(
	actor: Organizer,
	input: NewEventInput,
): Promise<{ id: string; slug: string }> {
	// Not `can(role, ...)`: creation has no prior membership to consult, and an
	// actor claiming any role other than owner over an event it is creating is
	// incoherent rather than merely unauthorized.
	if (actor.role !== "owner") throw new AccessError("forbidden");

	return runMutation(actor, async (tx) => {
		const { details: eventDetails, ...eventInput } = input;
		eventDetailsInput.parse(eventDetails);
		const normalizedDetails = normalizeEventDetails(eventDetails);
		const event = await insertEventRow(tx, {
			...eventInput,
			...normalizedDetails,
			id: actor.eventId,
			slug: eventSlug(input.title, actor.eventId),
			startsAt: new Date(input.startsAt),
			rsvpDeadline: input.rsvpDeadline ? new Date(input.rsvpDeadline) : null,
			createdBy: actor.userId,
		});
		if (!event) throw new AccessError("conflict");

		const membership = await insertOwnerMembership(
			tx,
			actor.eventId,
			actor.userId,
		);
		if (!membership) throw new AccessError("conflict");

		return {
			value: { id: event.id, slug: event.slug },
			events: [
				{
					action: "event.created",
					entityType: "event",
					entityId: event.id,
					eventId: actor.eventId,
				},
				{
					action: "membership.created",
					entityType: "event_membership",
					entityId: membership.userId,
					eventId: actor.eventId,
				},
			],
		};
	});
}

export async function updateEvent(
	actor: Organizer,
	input: {
		title: string;
		eventType: EventType;
		honoreeNames: string[];
		details: EventDetails;
		startsAt: string;
		timezone: string;
		venueName: string | null;
		venueAddress: string | null;
		venueMapUrl: string | null;
		description: string | null;
		maxCompanions: number;
		giftRegistryEnabled: boolean;
		rsvpDeadline: string | null;
		status: "draft" | "published" | "archived";
	},
) {
	if (!can(actor.role, "editEvent")) throw new AccessError("forbidden");
	// Archiving is an owner-only irreversible action and must go through
	// `deleteEvent`; the general edit path must never reach it.
	if (input.status === "archived") throw new AccessError("forbidden");
	return runMutation(actor, async (tx) => {
		const currentStatus = await findEventStatus(tx, actor.eventId);
		// Once archived, the event is immutable through the general update path;
		// only the owner-gated deleteEvent path may change status.
		if (currentStatus === "archived") throw new AccessError("forbidden");
		const { details: eventDetails, ...eventInput } = input;
		eventDetailsInput.parse(eventDetails);
		const normalizedDetails = normalizeEventDetails(eventDetails);
		const event = await updateEventRow(tx, actor.eventId, {
			...eventInput,
			...normalizedDetails,
			startsAt: new Date(input.startsAt),
			rsvpDeadline: input.rsvpDeadline ? new Date(input.rsvpDeadline) : null,
		});
		if (!event) throw new AccessError("not_found");
		return {
			value: event,
			events: [
				{
					action: "event.updated",
					entityType: "event",
					entityId: event.id,
					eventId: actor.eventId,
				},
			],
		};
	});
}

export async function deleteEvent(actor: Organizer) {
	if (!can(actor.role, "delete")) throw new AccessError("forbidden");
	return runMutation(actor, async (tx) => {
		const event = await archiveEventRow(tx, actor.eventId);
		if (!event) throw new AccessError("not_found");
		return {
			value: undefined,
			events: [
				{
					action: "event.archived",
					entityType: "event",
					entityId: event.id,
					eventId: actor.eventId,
				},
			],
		};
	});
}

export async function inviteCollaborator(actor: Organizer, email: string) {
	requireOwner(actor);
	return runMutation(actor, async (tx) => {
		const user = await findUserByEmail(tx, email.trim().toLowerCase());
		if (!user) throw new AccessError("not_found");
		const membership = await insertEditorMembership(tx, actor.eventId, user.id);
		if (!membership) throw new AccessError("conflict");
		return {
			value: membership,
			events: [
				{
					action: "collaborator.invited",
					entityType: "event_membership",
					entityId: membership.userId,
					eventId: actor.eventId,
				},
			],
		};
	});
}

export async function removeCollaborator(actor: Organizer, userId: string) {
	requireOwner(actor);
	return runMutation(actor, async (tx) => {
		const membership = await removeMembershipRow(tx, actor.eventId, userId);
		if (!membership) throw new AccessError("not_found");
		return {
			value: membership,
			events: [
				{
					action: "collaborator.removed",
					entityType: "event_membership",
					entityId: membership.userId,
					eventId: actor.eventId,
				},
			],
		};
	});
}

export { cancelReservation };
