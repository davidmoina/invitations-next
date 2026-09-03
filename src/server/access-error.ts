import type { AccessErrorCode } from "#/server/contracts/errors";

const ACCESS_ERROR_NAME = "AccessError";
const ACCESS_ERROR_CODES: readonly AccessErrorCode[] = [
	"unauthorized",
	"forbidden",
	"not_found",
	"conflict",
];

/**
 * An access failure raised before a request reaches its domain flow.
 *
 * It replaces the `Response` these paths used to throw. A `Response` cannot
 * be serialized across the server-function boundary, so throwing one made the
 * loader resolve to `undefined` and the page crash on a missing field — the
 * caller never saw the status at all. An `Error` survives that boundary.
 */
export class AccessError extends Error {
	readonly code: AccessErrorCode;

	constructor(code: AccessErrorCode) {
		super(code);
		this.name = ACCESS_ERROR_NAME;
		this.code = code;
	}
}

/**
 * Reads the access code out of a thrown value, or null if it is not one.
 *
 * Deliberately structural rather than an `instanceof` check: the serializer
 * rebuilds a thrown `AccessError` as a plain `Error` carrying the same data,
 * so on the receiving side the prototype is gone but `name` and `code` remain.
 */
export function accessErrorCode(value: unknown): AccessErrorCode | null {
	if (!(value instanceof Error) || value.name !== ACCESS_ERROR_NAME) {
		return null;
	}
	const { code } = value as Error & { code?: unknown };
	return ACCESS_ERROR_CODES.includes(code as AccessErrorCode)
		? (code as AccessErrorCode)
		: null;
}
