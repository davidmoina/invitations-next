import { can } from "#/accounts/authorization";
import type { Actor } from "#/audit/actor";
import {
	findEventStatus,
	insertGiftRow,
	updateGiftRow,
} from "#/platform/db/admin-mutations";
import {
	cancelGiftReservation,
	giftExistsOnEvent,
	isGiftRegistryEnabled,
	reserveGiftRow,
	runMutation,
} from "#/platform/db/domain-mutations";
import { AccessError } from "#/server/access-error";
import type { ReserveGiftResult } from "#/server/contracts/public";

type Organizer = Extract<Actor, { kind: "organizer" }>;

export type CreateGiftInput = {
	title: string;
	description: string | null;
	url: string | null;
	imagePublicId: string | null;
	position: number;
};

export type EditGiftInput = Partial<CreateGiftInput>;

export async function createGift(actor: Organizer, input: CreateGiftInput) {
	// Keep this runtime check even though TypeScript callers see `Organizer`:
	// server input is untrusted and can bypass compile-time types.
	if (actor.kind !== "organizer" || !can(actor.role, "editGift"))
		throw new AccessError("forbidden");

	return runMutation(actor, async (tx) => {
		// Scope is structurally anchored to the actor's event; any `eventId`
		// present in untrusted input is overwritten.
		const gift = await insertGiftRow(tx, { ...input, eventId: actor.eventId });
		if (!gift) throw new AccessError("conflict");
		return {
			value: gift,
			events: [
				{
					action: "gift.created",
					entityType: "gift",
					entityId: gift.id,
					eventId: actor.eventId,
				},
			],
		};
	});
}

export async function editGift(
	actor: Organizer,
	giftId: string,
	input: EditGiftInput,
) {
	if (actor.kind !== "organizer" || !can(actor.role, "editGift"))
		throw new AccessError("forbidden");

	return runMutation(actor, async (tx) => {
		const currentStatus = await findEventStatus(tx, actor.eventId);
		if (currentStatus === "archived") throw new AccessError("forbidden");

		const set: Parameters<typeof updateGiftRow>[3] = {};
		if (input.title !== undefined) set.title = input.title;
		if (input.description !== undefined) set.description = input.description;
		if (input.url !== undefined) set.url = input.url;
		if (input.imagePublicId !== undefined)
			set.imagePublicId = input.imagePublicId;
		if (input.position !== undefined) set.position = input.position;

		const gift = await updateGiftRow(tx, actor.eventId, giftId, set);
		if (!gift) throw new AccessError("not_found");
		return {
			value: gift,
			events: [
				{
					action: "gift.updated",
					entityType: "gift",
					entityId: gift.id,
					eventId: actor.eventId,
				},
			],
		};
	});
}

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "23505"
	);
}

export async function reserveGift(
	actor: Extract<Actor, { kind: "guest" }>,
	giftId: string,
): Promise<ReserveGiftResult> {
	try {
		return await runMutation<ReserveGiftResult>(actor, async (tx) => {
			if (
				!(await isGiftRegistryEnabled(tx, actor.eventId)) ||
				!(await giftExistsOnEvent(tx, actor.eventId, giftId))
			)
				return {
					value: { ok: false, error: { code: "invalid_or_expired_link" } },
					events: [
						{
							action: "gift.reserve_rejected",
							entityType: "gift",
							entityId: giftId,
							eventId: actor.eventId,
						},
					],
				};
			const inserted = await reserveGiftRow(tx, {
				eventId: actor.eventId,
				giftId,
				guestId: actor.guestId,
			});
			return inserted.length === 1
				? {
						value: { ok: true, giftId },
						events: [
							{
								action: "gift.reserved",
								entityType: "gift",
								entityId: giftId,
								eventId: actor.eventId,
							},
						],
					}
				: {
						value: { ok: false, error: { code: "gift_already_reserved" } },
						events: [
							{
								action: "gift.reserve_rejected",
								entityType: "gift",
								entityId: giftId,
								eventId: actor.eventId,
							},
						],
					};
		});
	} catch (error) {
		if (isUniqueViolation(error))
			return { ok: false, error: { code: "gift_already_reserved" } };
		throw error;
	}
}

export async function cancelReservation(
	actor: Extract<Actor, { kind: "guest" | "organizer" }>,
	giftId: string,
): Promise<ReserveGiftResult> {
	const isOrganizer = actor.kind === "organizer";
	if (isOrganizer && !can(actor.role, "cancelReservation"))
		return { ok: false, error: { code: "not_your_reservation" } };
	return runMutation<ReserveGiftResult>(actor, async (tx) => {
		// The registry toggle restricts guests only; organizers and editors
		// keep the cancellation override regardless of toggle state (R19 + R22).
		if (
			actor.kind === "guest" &&
			!(await isGiftRegistryEnabled(tx, actor.eventId))
		)
			return {
				value: { ok: false, error: { code: "invalid_or_expired_link" } },
				events: [
					{
						action: "gift.cancel_rejected",
						entityType: "gift",
						entityId: giftId,
						eventId: actor.eventId,
					},
				],
			};
		const row = await cancelGiftReservation(
			tx,
			actor.eventId,
			giftId,
			actor.kind === "guest" ? actor.guestId : null,
		);
		return {
			value: row
				? { ok: true, giftId }
				: { ok: false, error: { code: "not_your_reservation" } },
			events: [
				{
					action: "gift.reservation_cancelled",
					entityType: "gift",
					entityId: giftId,
					eventId: actor.eventId,
				},
			],
		};
	});
}
