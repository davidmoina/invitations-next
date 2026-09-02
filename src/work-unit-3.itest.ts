import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, expect, test } from "vitest";
import {
	createGuestSession,
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { callParameterizedJsonRoute } from "#/test/route-handler";
import { POST } from "../app/api/public/[slug]/rsvp/route";

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
test("RSVP persists through the public HTTP endpoint", async () => {
	const g = await createGuestSession(pool, f);
	const r = await callParameterizedJsonRoute(POST, {
		path: "/api",
		method: "POST",
		headers: { cookie: g.cookie },
		body: { attending: true, companions: 0 },
		params: { slug: f.slug },
	});
	expect(r.status).toBe(200);
	expect(await r.json()).toMatchObject({ ok: true });
});
