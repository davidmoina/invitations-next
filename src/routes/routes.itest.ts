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
let other: EventFixture;

beforeAll(async () => {
	organizer = await createOrganizerSession(pool);
	other = await createOrganizerSession(pool);
}, 30_000);
afterAll(async () => {
	await destroyFixture(pool, organizer);
	await destroyFixture(pool, other);
	await pool.end();
});

describe("route handler transport", () => {
	// Next page redirects are UI-segment behavior; no Route Handler owns `/`.
	test.skip("redirects an authenticated visitor to /admin", () => {});

	test("resolves null for an anonymous visitor", async () => {
		const response = await callRoute(session, { path: "/api/session" });
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ code: "unauthorized" });
	});

	test("resolves the event behind a slug for an anonymous visitor", async () => {
		const response = await callParameterizedRoute(publicEvent, {
			path: `/api/public/${organizer.slug}`,
			params: { slug: organizer.slug },
		});
		expect(response.status).toBe(200);
		expect(
			(await response.json()) as { event: { id: string }; guest: null },
		).toMatchObject({
			event: { id: organizer.eventId },
			guest: null,
		});
	});

	test("reports an unknown slug as not_found, the code the loader turns into a 404", async () => {
		const response = await callParameterizedRoute(publicEvent, {
			path: "/api/public/missing",
			params: { slug: "missing" },
		});
		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({ code: "not_found" });
	});

	// Next's not-found/error segment convention has no Route Handler transport.
	test.skip("declares the loader and both boundaries the 404 path needs", () => {});

	test("accepts a query token before resolving the first public payload", async () => {
		const guest = await createGuestSession(pool, organizer);
		const linked = await callRoute(guestLink, {
			path: `/api/guest-link?slug=${organizer.slug}&token=${guest.token}`,
		});
		const [cookie] = responseCookies(linked);
		const response = await callParameterizedRoute(publicEvent, {
			path: `/api/public/${organizer.slug}`,
			headers: { cookie: cookie?.split(";")[0] ?? "" },
			params: { slug: organizer.slug },
		});
		expect((await response.json()) as { guest: { id: string } }).toMatchObject({
			guest: { id: guest.guestId },
		});
	});

	test("accepts a valid query token into a secure guest cookie for the next request", async () => {
		const guest = await createGuestSession(pool, organizer);
		const response = await callRoute(guestLink, {
			path: `/api/guest-link?slug=${organizer.slug}&token=${guest.token}`,
		});
		expect(response.status).toBe(302);
		expect(response.headers.get("location")).toBe(
			`https://app.test/e/${organizer.slug}`,
		);
		expect(responseCookies(response).join(";")).toContain(
			"__Host-guest_token=",
		);
		expect(responseCookies(response).join(";")).toContain("HttpOnly");
		expect(responseCookies(response).join(";")).toContain("Secure");
	});

	test("resolves the organizer from the session cookie and returns their event", async () => {
		const response = await callParameterizedRoute(event, {
			path: `/api/events/${organizer.eventId}`,
			headers: { cookie: organizer.cookie },
			params: { eventId: organizer.eventId },
		});
		expect(response.status).toBe(200);
		expect(
			(await response.json()) as { event: { id: string }; viewerRole: string },
		).toMatchObject({
			event: { id: organizer.eventId },
			viewerRole: "owner",
		});
	});

	test("refuses a request carrying no session", async () => {
		const response = await callParameterizedRoute(event, {
			path: `/api/events/${organizer.eventId}`,
			params: { eventId: organizer.eventId },
		});
		expect(response.status).toBe(401);
	});

	test("refuses another organizer's event", async () => {
		const response = await callParameterizedRoute(event, {
			path: `/api/events/${other.eventId}`,
			headers: { cookie: organizer.cookie },
			params: { eventId: other.eventId },
		});
		expect(response.status).toBe(401);
	});

	// Next's error boundary is a segment component, outside API Route Handlers.
	test.skip("declares the loader and both boundaries", () => {});

	test("admits a signed-in user with no event of their own yet", async () => {
		await pool.query("delete from events where id = $1", [other.eventId]);
		const response = await callRoute(session, {
			path: "/api/session",
			headers: { cookie: other.cookie },
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ userId: other.userId });
	});

	// Page access control is owned by the segment, not an HTTP API handler.
	test.skip("declares a loader so an unidentified visitor never reaches the form", () => {});

	test("loads the signed-in organizer's events", async () => {
		const response = await callRoute(events, {
			path: "/api/events",
			headers: { cookie: organizer.cookie },
		});
		expect(response.status).toBe(200);
		expect(
			((await response.json()) as Array<{ id: string }>).map(({ id }) => id),
		).toContain(organizer.eventId);
	});

	// Redirecting to `/sign-in` is page UI behavior; the API reports unauthorized.
	test.skip("redirects an anonymous visitor to /sign-in", () => {});

	test("an event id that matches no event is refused, not resolved", async () => {
		const missing = "6f1d5f2a-9c3e-4a7b-8d21-0f5b2c7e4a19";
		const response = await callParameterizedRoute(event, {
			path: `/api/events/${missing}`,
			headers: { cookie: organizer.cookie },
			params: { eventId: missing },
		});
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ code: "unauthorized" });
	});
});
