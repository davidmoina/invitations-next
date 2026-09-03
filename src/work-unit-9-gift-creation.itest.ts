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
let fixture: EventFixture;
beforeAll(async () => {
	fixture = await createOrganizerSession(pool, { role: "editor" });
}, 30000);
afterAll(async () => {
	await destroyFixture(pool, fixture);
	await pool.end();
});
const input = {
	title: "Cena en Florencia",
	description: "Una cena para dos",
	url: "https://example.test/gifts/dinner",
	imagePublicId: "gifts/florence-dinner",
	position: 3,
};

test("an editor creates a gift scoped to their event", async () => {
	const response = await callParameterizedJsonRoute(POST, {
		path: "/api",
		method: "POST",
		headers: { cookie: fixture.cookie },
		body: input,
		params: { eventId: fixture.eventId },
	});
	expect(response.status).toBe(200);
	const created = (await response.json()) as { id: string };
	const rows = await pool.query(
		"select event_id, title, position from gifts where id=$1",
		[created.id],
	);
	expect(rows.rows).toEqual([
		{ event_id: fixture.eventId, title: input.title, position: 3 },
	]);
});

test("a guest is rejected before a gift row is inserted", async () => {
	const guest = await createGuestSession(pool, fixture);
	const before = await pool.query(
		"select count(*)::int count from gifts where event_id=$1",
		[fixture.eventId],
	);
	const response = await callParameterizedJsonRoute(POST, {
		path: "/api",
		method: "POST",
		headers: { cookie: guest.cookie },
		body: input,
		params: { eventId: fixture.eventId },
	});
	expect(response.status).toBe(403);
	const after = await pool.query(
		"select count(*)::int count from gifts where event_id=$1",
		[fixture.eventId],
	);
	expect(after.rows).toEqual(before.rows);
});
