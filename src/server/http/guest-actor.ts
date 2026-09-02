import type { Actor } from "#/audit/actor";
import { AccessError } from "#/server/access-error";

export function requireGuest(
	actor: Actor | null,
): Extract<Actor, { kind: "guest" }> {
	if (!actor) throw new AccessError("unauthorized");
	if (actor.kind !== "guest") throw new AccessError("forbidden");
	return actor;
}
