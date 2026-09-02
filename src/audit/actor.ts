import type { DrizzleTx } from "#/platform/db/transaction";

export type UserId = string & { readonly __brand: "UserId" };
export type EventId = string & { readonly __brand: "EventId" };
export type GuestId = string & { readonly __brand: "GuestId" };
export type EventRole = "owner" | "editor";
export type SystemReason = string & { readonly __brand: "SystemReason" };

export type Actor =
	| { kind: "organizer"; userId: UserId; eventId: EventId; role: EventRole }
	| { kind: "guest"; guestId: GuestId; eventId: EventId }
	| { kind: "system"; reason: SystemReason };

declare const audited: unique symbol;

/** A transaction issued only by `withActor`; callers cannot construct this brand. */
export type AuditedTx = DrizzleTx & { readonly [audited]: true };

export type AuditEvent = {
	action: string;
	entityType: string;
	entityId: string;
	eventId: EventId | null;
	summary?: Record<string, unknown>;
};

export type MutationOutcome<T> = {
	value: T;
	events: [AuditEvent, ...AuditEvent[]];
};

export type Mutation<TIn, TOut> = (
	tx: AuditedTx,
	actor: Actor,
	input: TIn,
) => Promise<MutationOutcome<TOut>>;
