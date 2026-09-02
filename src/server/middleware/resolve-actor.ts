import "server-only";

import type { Actor, EventId, GuestId, UserId } from "#/audit/actor";
import { guestTokenCookieName, guestTokenPattern } from "#/guests/constants";
import type { GuestToken, Membership } from "#/platform/db/actor-queries";
import { AccessError } from "#/server/access-error";
import { currentRequest } from "#/server/http/request-context";

type Session = { user: { id: string } } | null;

export type ActorDependencies = {
	getSession(headers: Headers): Promise<Session>;
	findMembership(userId: string, eventId: EventId): Promise<Membership>;
	findGuestToken(tokenHash: string): Promise<GuestToken>;
	now(): Date;
};

async function hashGuestToken(token: string): Promise<string> {
	const { hashToken } = await import("#/guests/tokens");
	return hashToken(token);
}

export function guestTokenFrom(headers: Headers): string | null {
	const cookie = headers.get("cookie");
	if (!cookie) return null;
	const token = cookie
		.split(";")
		.map((part) => part.trim())
		.find((part) => part.startsWith(`${guestTokenCookieName}=`))
		?.slice(`${guestTokenCookieName}=`.length);
	return token && guestTokenPattern.test(token) ? token : null;
}

async function loadDefaultDependencies(): Promise<ActorDependencies> {
	const [{ getAuth }, { findGuestToken, findMembership }] = await Promise.all([
		import("#/platform/auth/better-auth"),
		import("#/platform/db/actor-queries"),
	]);
	return {
		getSession: (headers) => getAuth().api.getSession({ headers }),
		findMembership,
		findGuestToken,
		now: () => new Date(),
	};
}

export async function resolveActor(
	eventId: EventId | null,
	dependencies?: ActorDependencies,
	guestToken?: string,
	headers = new Headers(),
): Promise<Actor | null> {
	const resolved = dependencies ?? (await loadDefaultDependencies());
	if (eventId !== null) {
		const session = await resolved.getSession(headers);
		if (session?.user.id) {
			const membership = await resolved.findMembership(
				session.user.id,
				eventId,
			);
			if (membership) {
				return {
					kind: "organizer",
					userId: session.user.id as UserId,
					eventId,
					role: membership.role,
				};
			}
		}
	}

	if (!guestToken || !guestTokenPattern.test(guestToken)) return null;
	const token = await resolved.findGuestToken(await hashGuestToken(guestToken));
	if (
		!token ||
		(eventId !== null && token.eventId !== eventId) ||
		token.revokedAt !== null ||
		token.expiresAt.getTime() <= resolved.now().getTime()
	)
		return null;
	return {
		kind: "guest",
		guestId: token.guestId as GuestId,
		eventId: token.eventId,
	};
}

export function resolveRequestActor(
	request: Request,
	dependencies?: ActorDependencies,
	eventId?: EventId,
): Promise<Actor | null> {
	return resolveActor(
		eventId ?? (request.headers.get("x-event-id") as EventId | null),
		dependencies,
		guestTokenFrom(request.headers) ?? undefined,
		request.headers,
	);
}

/** Caller-supplied event ids still require a membership lookup. */
export async function requireOrganizer(
	eventId: EventId,
): Promise<Extract<Actor, { kind: "organizer" }>> {
	const actor = await resolveRequestActor(currentRequest(), undefined, eventId);
	if (!actor) throw new AccessError("unauthorized");
	if (actor.kind !== "organizer") throw new AccessError("forbidden");
	return actor;
}

export async function requireAuthenticatedUser(): Promise<{ userId: UserId }> {
	const session = await (await loadDefaultDependencies()).getSession(
		currentRequest().headers,
	);
	if (!session?.user.id) throw new AccessError("unauthorized");
	return { userId: session.user.id as UserId };
}
