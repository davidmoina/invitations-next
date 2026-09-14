import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, expect, test } from "vitest";
import {
	createGuestSession,
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { eventInput } from "#/test/event-input";
import { callJsonRoute, callParameterizedRoute } from "#/test/route-handler";
import { POST } from "../app/api/events/route";
import { GET } from "../app/api/public/[slug]/route";

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
test("public event DTO structurally omits sensitive event-type fields", async () => {
	const r = await callJsonRoute(POST, {
		path: "/api/events",
		method: "POST",
		headers: { cookie: f.cookie },
		body: eventInput({
			eventType: "baby_shower",
			details: { type: "baby_shower", dueDate: "2030-07-01", babySex: "girl" },
		}),
	});
	const created = (await r.json()) as { id: string; slug: string };
	const guest = await createGuestSession(pool, {
		...f,
		slug: created.slug,
		eventId: created.id as EventFixture["eventId"],
	});
	const publicResponse = await callParameterizedRoute(GET, {
		path: `/api/public/${created.slug}`,
		headers: { cookie: guest.cookie },
		params: { slug: created.slug },
	});
	const body = (await publicResponse.json()) as {
		event: Record<string, unknown>;
	};
	expect(body.event).not.toHaveProperty("babySex");
	expect(body.event).not.toHaveProperty("turningAge");
});
