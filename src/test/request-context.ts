import type { EventId } from "#/audit/actor";
import { withRequestContext } from "#/server/http/request-context";

/** Runs a server helper in a Next Route Handler-shaped request context. */
export function withTestRequestContext<T>(
	headers: HeadersInit,
	operation: () => T,
): T {
	return withRequestContext(
		new Request("https://app.test", { headers }),
		operation,
	);
}

export function eventScope(eventId: string): EventId {
	return eventId as EventId;
}
