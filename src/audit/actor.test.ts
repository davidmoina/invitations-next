import { expectTypeOf, test } from "vitest";

import type {
	Actor,
	AuditEvent,
	AuditedTx,
	Mutation,
	MutationOutcome,
} from "./actor";

test("a mutation outcome requires at least one audit event", () => {
	type ValidOutcome = MutationOutcome<{ id: string }>;
	type ValidMutation = Mutation<{ id: string }, { id: string }>;

	expectTypeOf<ValidOutcome["events"]>().toExtend<
		[AuditEvent, ...AuditEvent[]]
	>();
	expectTypeOf<ValidMutation>().parameters.toEqualTypeOf<
		[AuditedTx, Actor, { id: string }]
	>();
});
