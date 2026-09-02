import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, expect, test } from "vitest";
import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { eventInput } from "#/test/event-input";
import { callJsonRoute, callParameterizedRoute } from "#/test/route-handler";
import { GET } from "../app/api/events/[eventId]/route";
import { POST } from "../app/api/events/route";

const url = process.env.DATABASE_URL_TEST;
if (!url)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: url });
let fixture: EventFixture;
beforeAll(async () => {
	fixture = await createOrganizerSession(pool);
}, 30000);
afterAll(async () => {
	await pool.query("delete from audit_log where actor_user_id = $1", [
		fixture.userId,
	]);
	await pool.query("delete from events where created_by = $1", [
		fixture.userId,
	]);
	await destroyFixture(pool, fixture);
	await pool.end();
});
test("event type writes use the HTTP schema and preserve typed details", async () => {
	const created = await callJsonRoute(POST, {
		path: "/api/events",
		method: "POST",
		headers: { cookie: fixture.cookie },
		body: eventInput({
			eventType: "baby_shower",
			details: { type: "baby_shower", dueDate: "2030-07-01", babySex: "girl" },
			honoreeNames: ["Baby"],
		}),
	});
	expect(created.status).toBe(200);
	const value = (await created.json()) as { id: string };
	const read = await callParameterizedRoute(GET, {
		path: `/api/events/${value.id}`,
		headers: { cookie: fixture.cookie },
		params: { eventId: value.id },
	});
	expect(read.status).toBe(200);
	expect(await read.json()).toMatchObject({
		event: { eventType: "baby_shower" },
	});
	const invalid = await callJsonRoute(POST, {
		path: "/api/events",
		method: "POST",
		headers: { cookie: fixture.cookie },
		body: { ...eventInput(), eventType: "wedding", details: { type: "other" } },
	});
	expect(invalid.status).toBe(400);
});
