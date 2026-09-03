import { randomUUID } from "node:crypto";

import type { Pool } from "@neondatabase/serverless";

import type { EventId, EventRole, GuestId } from "#/audit/actor";
import { generateGuestToken, hashToken } from "#/guests/tokens";

/**
 * Real authenticated fixtures for integration tests and runtime smokes.
 *
 * Sessions are minted through Better Auth's own `signUpEmail` rather than by
 * writing a `session` row directly: the cookie is signed with the configured
 * secret, and hand-rolling that signature would let the fixture drift from
 * whatever the library actually accepts. Guest tokens have no such API — the
 * application issues them itself — so those rows are written here, hashed the
 * same way `resolveActor` hashes an incoming token.
 */

export type EventFixture = {
	userId: string;
	eventId: EventId;
	slug: string;
	/** Ready to send as a `Cookie` request header. */
	cookie: string;
	email: string;
};

export type GuestFixture = {
	guestId: GuestId;
	token: string;
	cookie: string;
};

/** Matches the 43-character base64url shape `resolveActor` requires. */
export function newGuestToken(): string {
	return generateGuestToken();
}

async function signUp(): Promise<{
	userId: string;
	cookie: string;
	email: string;
}> {
	const { getAuth } = await import("#/platform/auth/better-auth");
	const email = `fixture-${randomUUID()}@example.test`;
	const response = await getAuth().api.signUpEmail({
		body: { name: "Fixture Organizer", email, password: randomUUID() },
		asResponse: true,
	});
	if (!response.ok) {
		throw new Error(`Fixture sign-up failed: ${response.status}`);
	}
	const setCookie = response.headers
		.getSetCookie()
		.find((value) => value.startsWith("better-auth.session_token="));
	if (!setCookie) {
		throw new Error("Fixture sign-up returned no session cookie.");
	}
	const { user } = (await response.json()) as { user: { id: string } };
	return { userId: user.id, cookie: setCookie.split(";")[0] ?? "", email };
}

/** A signed-in user owning (or editing) one freshly created event. */
export async function createOrganizerSession(
	pool: Pool,
	options: { role?: EventRole } = {},
): Promise<EventFixture> {
	const { userId, cookie, email } = await signUp();
	const eventId = randomUUID() as EventId;
	const slug = `fixture-${randomUUID()}`;
	await pool.query(
		"insert into events (id, slug, title, event_type, starts_at, timezone, max_companions, created_by) values ($1, $2, 'Fixture event', 'other', '2030-01-01', 'UTC', 2, $3)",
		[eventId, slug, userId],
	);
	await pool.query(
		"insert into event_memberships (event_id, user_id, role) values ($1, $2, $3)",
		[eventId, userId, options.role ?? "owner"],
	);
	return { userId, eventId, slug, cookie, email };
}

/** A guest of `event` holding a valid (or deliberately revoked) link. */
export async function createGuestSession(
	pool: Pool,
	event: EventFixture,
	options: { revoked?: boolean } = {},
): Promise<GuestFixture> {
	const guestId = randomUUID() as GuestId;
	const token = newGuestToken();
	await pool.query(
		"insert into guests (id, event_id, display_name, name_normalized, source) values ($1, $2, 'Fixture Guest', 'fixture guest', 'public_link')",
		[guestId, event.eventId],
	);
	await pool.query(
		"insert into guest_tokens (guest_id, event_id, token_hash, expires_at, revoked_at) values ($1, $2, $3, $4, $5)",
		[
			guestId,
			event.eventId,
			await hashToken(token),
			new Date("2035-01-01T00:00:00.000Z"),
			options.revoked ? new Date("2020-01-01T00:00:00.000Z") : null,
		],
	);
	return {
		guestId,
		token,
		cookie: `__Host-guest_token=${token}`,
	};
}

/** Removes the event and the user the fixture created, in FK-safe order. */
export async function destroyFixture(
	pool: Pool,
	event: EventFixture,
): Promise<void> {
	await pool.query("delete from audit_log where event_id = $1", [
		event.eventId,
	]);
	await pool.query("delete from events where id = $1", [event.eventId]);
	await pool.query('delete from "user" where id = $1', [event.userId]);
}
