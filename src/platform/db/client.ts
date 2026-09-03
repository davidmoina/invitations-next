import "server-only";

import type {
	Actor,
	AuditEvent,
	AuditedTx,
	EventId,
	MutationOutcome,
} from "#/audit/actor";
import { type Database, getDatabase } from "#/platform/db/connection";
import { auditLog } from "#/platform/db/schema/domain";

type DbTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
type ReadTx = Pick<Database, "query" | "select">;

function isNonBlankString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isResolvableActor(actor: unknown): actor is Actor {
	if (typeof actor !== "object" || actor === null || !("kind" in actor)) {
		return false;
	}

	const candidate = actor as Record<string, unknown>;
	switch (candidate.kind) {
		case "organizer":
			return (
				isNonBlankString(candidate.userId) &&
				isNonBlankString(candidate.eventId) &&
				(candidate.role === "owner" || candidate.role === "editor")
			);
		case "guest":
			return (
				isNonBlankString(candidate.guestId) &&
				isNonBlankString(candidate.eventId)
			);
		case "system":
			return isNonBlankString(candidate.reason);
		default:
			return false;
	}
}

function actorLabel(actor: Actor): string {
	switch (actor.kind) {
		case "organizer":
			return actor.userId;
		case "guest":
			return actor.guestId;
		case "system":
			return actor.reason;
	}
}

function actorEventId(actor: Actor): EventId | null {
	return actor.kind === "system" ? null : actor.eventId;
}

/**
 * Appends immutable audit rows inside an actor-bound transaction.
 * Callers receive this function, never the raw Drizzle database handle.
 */
export async function appendAuditEvents(
	tx: AuditedTx,
	actor: Actor,
	events: [AuditEvent, ...AuditEvent[]],
): Promise<void> {
	if (!isResolvableActor(actor)) {
		throw new Error("A resolvable actor is required to append audit events.");
	}

	const transaction = tx as unknown as DbTransaction;
	await transaction.insert(auditLog).values(
		events.map((event) => ({
			action: event.action,
			actorGuestId: actor.kind === "guest" ? actor.guestId : null,
			actorKind: actor.kind,
			actorLabel: actorLabel(actor),
			actorUserId: actor.kind === "organizer" ? actor.userId : null,
			entityId: event.entityId,
			entityType: event.entityType,
			eventId: event.eventId ?? actorEventId(actor),
			summary: event.summary ?? {},
		})),
	);
}

/** Runs a mutation and its non-empty audit trail in one database transaction. */
export async function withActor<T>(
	actor: Actor,
	run: (tx: AuditedTx, actor: Actor) => Promise<MutationOutcome<T>>,
): Promise<T> {
	if (!isResolvableActor(actor)) {
		throw new Error("A resolvable actor is required for database mutations.");
	}

	return getDatabase().transaction(async (transaction) => {
		const { value, events } = await run(
			transaction as unknown as AuditedTx,
			actor,
		);
		await appendAuditEvents(transaction as unknown as AuditedTx, actor, events);
		return value;
	});
}

/** Exposes only query construction for read paths; no mutation or transaction methods. */
export function readOnly(): ReadTx {
	const db = getDatabase();
	return {
		query: db.query,
		select: db.select.bind(db),
	};
}
