import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
	createGuestSession,
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import {
	callParameterizedJsonRoute,
	callParameterizedRoute,
} from "#/test/route-handler";
import { GET as event } from "../../../app/api/events/[eventId]/route";
import { GET as publicEvent } from "../../../app/api/public/[slug]/route";
import { POST as rsvp } from "../../../app/api/public/[slug]/rsvp/route";

const databaseUrl = process.env.DATABASE_URL_TEST;
if (!databaseUrl)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: databaseUrl });
let first: EventFixture;
let second: EventFixture;

beforeAll(async () => {
	first = await createOrganizerSession(pool);
	second = await createOrganizerSession(pool);
}, 30_000);
afterAll(async () => {
	await destroyFixture(pool, first);
	await destroyFixture(pool, second);
	await pool.end();
});

describe("actor resolution through HTTP routes", () => {
	test("a real Better Auth session plus membership resolves an organizer", async () => {
		const response = await callParameterizedRoute(event, {
			path: `/api/events/${first.eventId}`,
			headers: { cookie: first.cookie },
			params: { eventId: first.eventId },
		});
		expect(response.status).toBe(200);
		expect((await response.json()) as { viewerRole: string }).toMatchObject({
			viewerRole: "owner",
		});
	});

	test("a valid session is denied on an event it has no membership in", async () => {
		const response = await callParameterizedRoute(event, {
			path: `/api/events/${second.eventId}`,
			headers: { cookie: first.cookie },
			params: { eventId: second.eventId },
		});
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ code: "unauthorized" });
	});

	test("a real guest token resolves with no x-event-id header", async () => {
		const guest = await createGuestSession(pool, first);
		const response = await callParameterizedRoute(publicEvent, {
			path: `/api/public/${first.slug}`,
			headers: { cookie: guest.cookie },
			params: { slug: first.slug },
		});
		expect(response.status).toBe(200);
		expect(
			(await response.json()) as { guest: { id: string } | null },
		).toMatchObject({
			guest: { id: guest.guestId },
		});
	});

	test("an organizer session with no event scope is denied by a public RSVP", async () => {
		const response = await callParameterizedJsonRoute(rsvp, {
			path: `/api/public/${first.slug}/rsvp`,
			method: "POST",
			headers: { cookie: first.cookie },
			body: { attending: true, companions: 0 },
			params: { slug: first.slug },
		});
		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({ code: "forbidden" });
	});

	test("a revoked guest token is denied", async () => {
		const guest = await createGuestSession(pool, first, { revoked: true });
		const response = await callParameterizedRoute(publicEvent, {
			path: `/api/public/${first.slug}`,
			headers: { cookie: guest.cookie },
			params: { slug: first.slug },
		});
		expect(response.status).toBe(200);
		expect((await response.json()) as { guest: null }).toMatchObject({
			guest: null,
		});
	});

	test("an unsigned session token is denied", async () => {
		const [name, value] = first.cookie.split("=");
		const unsigned = `${name}=${(value ?? "").split(".")[0]}`;
		const response = await callParameterizedRoute(event, {
			path: `/api/events/${first.eventId}`,
			headers: { cookie: unsigned },
			params: { eventId: first.eventId },
		});
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ code: "unauthorized" });
	});

	test("does not accept a self-describing guest token outside its event URL scope", async () => {
		const guest = await createGuestSession(pool, first);
		const response = await callParameterizedJsonRoute(rsvp, {
			path: `/api/public/${second.slug}/rsvp`,
			method: "POST",
			headers: { cookie: guest.cookie },
			body: { attending: true, companions: 0 },
			params: { slug: second.slug },
		});
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ code: "unauthorized" });
		const result = await pool.query(
			"select attending from guests where id = $1",
			[guest.guestId],
		);
		expect(result.rows).toEqual([{ attending: null }]);
	});
});
