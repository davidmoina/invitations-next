import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, expect, test } from "vitest";
import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { eventInput } from "#/test/event-input";
import { callJsonRoute } from "#/test/route-handler";
import { POST } from "../app/api/events/route";

const url = process.env.DATABASE_URL_TEST;
if (!url)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: url });
let f: EventFixture;
beforeAll(async () => {
	f = await createOrganizerSession(pool);
}, 30000);
afterAll(async () => {
	await pool.query("delete from audit_log where actor_user_id = $1", [
		f.userId,
	]);
	await pool.query("delete from events where created_by = $1", [f.userId]);
	await destroyFixture(pool, f);
	await pool.end();
});
test("creates an event through authenticated HTTP and audits it", async () => {
	const r = await callJsonRoute(POST, {
		path: "/api/events",
		method: "POST",
		headers: { cookie: f.cookie },
		body: eventInput(),
	});
	expect(r.status).toBe(200);
	const v = (await r.json()) as { id: string; slug: string };
	expect(v.slug).toBeTruthy();
	const audit = await pool.query(
		"select action from audit_log where event_id=$1",
		[v.id],
	);
	expect(audit.rows.map((x) => x.action)).toContain("event.created");
});
