import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, expect, test } from "vitest";
import {
	createGuestSession,
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { callParameterizedJsonRoute } from "#/test/route-handler";
import { POST } from "../app/api/events/[eventId]/gifts/route";

const url = process.env.DATABASE_URL_TEST;
if (!url)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: url });
let f: EventFixture;
beforeAll(async () => {
	f = await createOrganizerSession(pool);
}, 30000);
afterAll(async () => {
	await destroyFixture(pool, f);
	await pool.end();
});
test("creates gifts through an organizer endpoint and rejects a guest", async () => {
	const input = {
		title: "HTTP gift",
		description: null,
		url: null,
		imagePublicId: null,
		position: 0,
	};
	const ok = await callParameterizedJsonRoute(POST, {
		path: "/api",
		method: "POST",
		headers: { cookie: f.cookie },
		body: input,
		params: { eventId: f.eventId },
	});
	expect(ok.status).toBe(200);
	const guest = await createGuestSession(pool, f);
	const denied = await callParameterizedJsonRoute(POST, {
		path: "/api",
		method: "POST",
		headers: { cookie: guest.cookie },
		body: input,
		params: { eventId: f.eventId },
	});
	expect(denied.status).toBe(403);
});
