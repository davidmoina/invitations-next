/**
 * A domain-level validation failure distinct from access control.
 *
 * These travel across the server-function boundary as thrown errors; they
 * carry enough detail for the UI to show a precise message without echoing
 * raw internals.
 */
export class CompanionCapError extends Error {
	readonly code = "companion_cap_exceeded" as const;

	constructor(public readonly maxCompanions: number) {
		super(`Maximum companions allowed: ${maxCompanions}`);
		this.name = "CompanionCapError";
	}
}
