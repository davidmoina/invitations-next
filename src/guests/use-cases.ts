import { can } from "#/accounts/authorization";
import type { Actor, AuditedTx, EventId, GuestId } from "#/audit/actor";
import { evaluateCompanionCap } from "#/events/rules";
import { findEventStatus, updateGuestRow } from "#/platform/db/admin-mutations";

import {
	findGuestByIdentity,
	getEventCap,
	getEventStartsAt,
	insertGuests,
	insertGuestTokenRow,
	insertPublicGuest,
	runMutation,
	upsertGuestRsvp,
} from "#/platform/db/domain-mutations";
import { AccessError } from "#/server/access-error";
import type { RsvpResult } from "#/server/contracts/public";
import { CompanionCapError } from "#/server/domain-error";

import { guestTokenExpiresAt } from "./constants";
import { normalizeEmail, normalizeName } from "./rules";
import { generateGuestToken, hashToken } from "./tokens";

export type NewGuest = { displayName: string; email: string | null };

export type EditGuestInput = Partial<{
	displayName: string;
	email: string | null;
	attending: boolean | null;
	companions: number;
}>;

export async function addGuests(
	actor: Extract<Actor, { kind: "organizer" }>,
	input: NewGuest[],
) {
	return runMutation(actor, async (tx) => {
		const startsAt = await getEventStartsAt(tx, actor.eventId);
		if (!startsAt) throw new Error("Event does not exist");
		const rows = await insertGuests(
			tx,
			input.map((guest) => ({
				eventId: actor.eventId,
				displayName: guest.displayName.trim(),
				nameNormalized: normalizeName(guest.displayName),
				email: guest.email?.trim() ?? null,
				emailNormalized: guest.email ? normalizeEmail(guest.email) : null,
				source: "preloaded" as const,
			})),
		);
		const added = await Promise.all(
			rows.map(async (guest) => {
				const token = await issueGuestTokenFor(
					tx,
					actor.eventId,
					guest.id as GuestId,
					startsAt,
				);
				return { ...guest, token };
			}),
		);
		return {
			value: added,
			events: [
				{
					action: "guest.added",
					entityType: "guest",
					entityId: rows[0]?.id ?? "batch",
					eventId: actor.eventId,
				},
			],
		};
	});
}

export async function issueGuestTokenFor(
	tx: AuditedTx,
	eventId: EventId,
	guestId: string,
	startsAt: Date,
): Promise<string> {
	const token = generateGuestToken();
	const inserted = await insertGuestTokenRow(tx, {
		guestId,
		eventId,
		tokenHash: await hashToken(token),
		expiresAt: guestTokenExpiresAt(startsAt),
	});
	if (!inserted) throw new Error("Guest token did not persist");
	return token;
}

export async function registerPublicGuest(eventId: EventId, input: NewGuest) {
	const actor = {
		kind: "system" as const,
		reason: "public_registration" as never,
	};
	return runMutation(actor, async (tx) => {
		const normalizedEmail = input.email ? normalizeEmail(input.email) : null;
		const normalizedName = normalizeName(input.displayName);
		const inserted = await insertPublicGuest(tx, {
			eventId,
			displayName: input.displayName.trim(),
			nameNormalized: normalizedName,
			email: input.email?.trim() ?? null,
			emailNormalized: normalizedEmail,
			source: "public_link",
		});
		if (inserted) {
			return {
				value: { id: inserted.id, reconciled: false },
				events: [
					{
						action: "guest.registered",
						entityType: "guest",
						entityId: inserted.id,
						eventId,
					},
				],
			};
		}
		// The insert was a no-op because another concurrent request committed
		// the same normalized identity first. Re-query the existing row so the
		// response stays generic and the caller can issue a token for it.
		const existing = await findGuestByIdentity(
			tx,
			eventId,
			normalizedEmail,
			normalizedName,
		);
		if (!existing) throw new Error("Guest registration did not persist");
		return {
			value: { id: existing.id, reconciled: true },
			events: [
				{
					action: "guest.reconciled",
					entityType: "guest",
					entityId: existing.id,
					eventId,
				},
			],
		};
	});
}

export async function submitRsvp(
	actor: Extract<Actor, { kind: "guest" }>,
	input: { attending: boolean; companions: number },
): Promise<RsvpResult> {
	return runMutation<RsvpResult>(actor, async (tx) => {
		const max = await getEventCap(tx, actor.eventId);
		if (max === null)
			return {
				value: {
					ok: false,
					error: { code: "invalid_or_expired_link" },
				} satisfies RsvpResult,
				events: [
					{
						action: "rsvp.rejected",
						entityType: "guest",
						entityId: actor.guestId,
						eventId: actor.eventId,
					},
				],
			};
		const cap = evaluateCompanionCap(
			max,
			input.attending ? input.companions : 0,
		);
		if (!cap.ok)
			return {
				value: {
					ok: false,
					error: {
						code: "companion_cap_exceeded",
						maxCompanions: cap.maxCompanions,
					},
				} satisfies RsvpResult,
				events: [
					{
						action: "rsvp.rejected",
						entityType: "guest",
						entityId: actor.guestId,
						eventId: actor.eventId,
					},
				],
			};
		const stored = await upsertGuestRsvp(tx, {
			eventId: actor.eventId,
			guestId: actor.guestId,
			attending: input.attending,
			companions: cap.companions,
		});
		if (
			!stored?.respondedAt ||
			stored.attending !== input.attending ||
			stored.companions !== cap.companions
		)
			throw new Error("RSVP write confirmation failed");
		return {
			value: {
				ok: true,
				stored: {
					attending: stored.attending,
					companions: stored.companions,
					respondedAt: stored.respondedAt.toISOString(),
				},
			},
			events: [
				{
					action: "rsvp.submitted",
					entityType: "guest",
					entityId: actor.guestId,
					eventId: actor.eventId,
				},
			],
		};
	});
}

export async function editGuest(
	actor: Extract<Actor, { kind: "organizer" }>,
	guestId: string,
	input: EditGuestInput,
) {
	if (actor.kind !== "organizer" || !can(actor.role, "editGuest"))
		throw new AccessError("forbidden");

	return runMutation(actor, async (tx) => {
		const currentStatus = await findEventStatus(tx, actor.eventId);
		if (currentStatus === "archived") throw new AccessError("forbidden");

		const set: Parameters<typeof updateGuestRow>[3] = {};
		if (input.displayName !== undefined) {
			set.displayName = input.displayName.trim();
			set.nameNormalized = normalizeName(input.displayName);
		}
		if (input.email !== undefined) {
			set.email = input.email?.trim() ?? null;
			set.emailNormalized = input.email ? normalizeEmail(input.email) : null;
		}
		if (input.attending !== undefined) {
			set.attending = input.attending;
			set.respondedAt = input.attending === null ? null : new Date();
		}
		if (input.companions !== undefined) {
			const max = await getEventCap(tx, actor.eventId);
			if (max === null) throw new AccessError("not_found");
			const cap = evaluateCompanionCap(max, input.companions);
			if (!cap.ok) throw new CompanionCapError(cap.maxCompanions);
			set.companions = cap.companions;
		}

		const guest = await updateGuestRow(tx, actor.eventId, guestId, set);
		if (!guest) throw new AccessError("not_found");
		return {
			value: guest,
			events: [
				{
					action: "guest.updated",
					entityType: "guest",
					entityId: guest.id,
					eventId: actor.eventId,
				},
			],
		};
	});
}
