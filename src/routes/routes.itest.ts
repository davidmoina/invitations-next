import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
	createGuestSession,
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import {
	callParameterizedRoute,
	callRoute,
	responseCookies,
} from "#/test/route-handler";
import { GET as event } from "../../app/api/events/[eventId]/route";
import { GET as events } from "../../app/api/events/route";
import { GET as guestLink } from "../../app/api/guest-link/route";
import { GET as publicEvent } from "../../app/api/public/[slug]/route";
import { GET as session } from "../../app/api/session/route";

const databaseUrl = process.env.DATABASE_URL_TEST;
if (!databaseUrl)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: databaseUrl });
let organizer: EventFixture;

beforeAll(async () => {
	organizer = await createOrganizerSession(pool);
}, 30_000);
afterAll(async () => {
	await destroyFixture(pool, organizer);
	await pool.end();
});

describe("route handler transport", () => {
	test("serves public and organizer resources only through their HTTP handlers", async () => {
		const [anonymous, missing, mine, signed, signedEvents, anonymousSession] =
			await Promise.all([
				callParameterizedRoute(publicEvent, {
					path: `/api/public/${organizer.slug}`,
					params: { slug: organizer.slug },
				}),
				callParameterizedRoute(publicEvent, {
					path: "/api/public/missing",
					params: { slug: "missing" },
				}),
				callParameterizedRoute(event, {
					path: `/api/events/${organizer.eventId}`,
					headers: { cookie: organizer.cookie },
					params: { eventId: organizer.eventId },
				}),
				callRoute(session, {
					path: "/api/session",
					headers: { cookie: organizer.cookie },
				}),
				callRoute(events, {
					path: "/api/events",
					headers: { cookie: organizer.cookie },
				}),
				callRoute(session, { path: "/api/session" }),
			]);
		expect(anonymous.status).toBe(200);
		expect(
			((await anonymous.json()) as { event: { id: string }; guest: null }).event
				.id,
		).toBe(organizer.eventId);
		expect(missing.status).toBe(404);
		expect(mine.status).toBe(200);
		expect(((await mine.json()) as { event: { id: string } }).event.id).toBe(
			organizer.eventId,
		);
		expect(signed.status).toBe(200);
		expect(
			((await signedEvents.json()) as Array<{ id: string }>).map(
				({ id }) => id,
			),
		).toContain(organizer.eventId);
		expect(anonymousSession.status).toBe(401);
	});

	test("validates slug scope before setting the guest cookie and redirects with 302", async () => {
		const guest = await createGuestSession(pool, organizer);
		const linked = await callRoute(guestLink, {
			path: `/api/guest-link?slug=${organizer.slug}&token=${guest.token}`,
		});
		expect(linked.status).toBe(302);
		expect(linked.headers.get("location")).toBe(
			`https://app.test/e/${organizer.slug}`,
		);
		const [cookie] = responseCookies(linked);
		expect(cookie).toContain("__Host-guest_token=");
		expect(cookie).toContain("HttpOnly");
		expect(cookie).toContain("Secure");
		const wrong = await callRoute(guestLink, {
			path: `/api/guest-link?slug=wrong&token=${guest.token}`,
		});
		expect(wrong.status).toBe(302);
		expect(responseCookies(wrong)).toEqual([]);
	});
});
