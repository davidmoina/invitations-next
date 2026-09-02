import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, expect, test } from "vitest";
import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { callParameterizedRoute } from "#/test/route-handler";
import { DELETE } from "../app/api/events/[eventId]/route";

const url = process.env.DATABASE_URL_TEST;
if (!url)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: url });
let owner: EventFixture;
let editor: EventFixture;
beforeAll(async () => {
	owner = await createOrganizerSession(pool);
	editor = await createOrganizerSession(pool, { role: "editor" });
	await pool.query(
		"insert into event_memberships (event_id,user_id,role) values ($1,$2,'editor')",
		[owner.eventId, editor.userId],
	);
}, 30000);
afterAll(async () => {
	await destroyFixture(pool, owner);
	await destroyFixture(pool, editor);
	await pool.end();
});
test("only owners may archive an event", async () => {
	const denied = await callParameterizedRoute(DELETE, {
		path: "/api",
		headers: { cookie: editor.cookie },
		params: { eventId: owner.eventId },
	});
	expect(denied.status).toBe(403);
	const ok = await callParameterizedRoute(DELETE, {
		path: "/api",
		headers: { cookie: owner.cookie },
		params: { eventId: owner.eventId },
	});
	expect(ok.status).toBe(204);
	const audit = await pool.query(
		"select action from audit_log where event_id=$1",
		[owner.eventId],
	);
	expect(audit.rows.map((x) => x.action)).toContain("event.archived");
});
