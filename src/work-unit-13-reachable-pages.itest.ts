import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, expect, test } from "vitest";
import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { callRoute } from "#/test/route-handler";
import { GET } from "../app/api/events/route";

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
test("organizer dashboard data remains reachable through its API boundary", async () => {
	const r = await callRoute(GET, {
		path: "/api/events",
		headers: { cookie: f.cookie },
	});
	expect(r.status).toBe(200);
	expect(await r.json()).toContainEqual(
		expect.objectContaining({ id: f.eventId }),
	);
});
