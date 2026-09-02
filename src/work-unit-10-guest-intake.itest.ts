import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, expect, test } from "vitest";
import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { callParameterizedJsonRoute } from "#/test/route-handler";
import { POST } from "../app/api/events/[eventId]/guests/route";

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
test("adds guests through the organizer route", async () => {
	const r = await callParameterizedJsonRoute(POST, {
		path: "/api",
		method: "POST",
		headers: { cookie: f.cookie },
		body: { guests: [{ displayName: "Intake", email: "intake@example.test" }] },
		params: { eventId: f.eventId },
	});
	expect(r.status).toBe(200);
	const count = await pool.query(
		"select count(*)::int count from guests where event_id=$1",
		[f.eventId],
	);
	expect(count.rows[0]?.count).toBe(1);
});
