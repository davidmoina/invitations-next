import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, expect, test } from "vitest";
import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { callParameterizedRoute } from "#/test/route-handler";
import { GET } from "../app/api/public/[slug]/route";

const url = process.env.DATABASE_URL_TEST;
if (!url)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: url });
let f: EventFixture;
beforeAll(async () => {
	f = await createOrganizerSession(pool);
	await pool.query(
		"update events set gift_registry_enabled=false where id=$1",
		[f.eventId],
	);
}, 30000);
afterAll(async () => {
	await destroyFixture(pool, f);
	await pool.end();
});
test("disabled registries do not disclose gifts on the public endpoint", async () => {
	const r = await callParameterizedRoute(GET, {
		path: "/api",
		params: { slug: f.slug },
	});
	expect(r.status).toBe(200);
	expect(await r.json()).toMatchObject({ gifts: [] });
});
