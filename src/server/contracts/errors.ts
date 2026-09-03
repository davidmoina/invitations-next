/**
 * FROZEN — src/server/contracts/**.
 *
 * Design D9: the two-agent contract seam. May contain types, Zod schemas,
 * and literal unions ONLY. No imports from `platform/`, no Drizzle-inferred
 * types, no `Date` on the wire (ISO-8601 strings only), no functions with
 * bodies.
 *
 * Owner: Claude is the sole proposer of this file. Agent B (src/ui/**) may
 * import it read-only and request changes; it never edits it directly.
 * During parallel work the seam is additive-only — a new optional field is
 * fine, a rename/removal/narrowing is a stop-the-world renegotiation
 * announced to both sides.
 */

/** Errors a guest-facing flow can report back to the browser. */
export type PublicError =
	| { code: "companion_cap_exceeded"; maxCompanions: number }
	| { code: "gift_already_reserved" }
	| { code: "not_your_reservation" }
	| { code: "invalid_or_expired_link" }
	| { code: "rsvp_closed" }
	| { code: "unexpected" };

/**
 * Failures that abort a request before any domain result exists.
 *
 * Distinct from `PublicError`: those describe a flow that ran and declined,
 * and travel inside a result value. These describe a request that never
 * reached its flow at all, and travel as a thrown error.
 */
export type AccessErrorCode =
	| "unauthorized"
	| "forbidden"
	| "not_found"
	| "conflict";
