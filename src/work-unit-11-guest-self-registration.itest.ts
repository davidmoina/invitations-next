import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, expect, test } from "vitest";
import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import {
	callParameterizedJsonRoute,
	responseCookies,
} from "#/test/route-handler";
import { POST } from "../app/api/public/[slug]/guests/route";

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
test("self-registers through the public URL and establishes the guest cookie", async () => {
	const r = await callParameterizedJsonRoute(POST, {
		path: "/api",
		method: "POST",
		body: { displayName: "Public", email: "public@example.test" },
		params: { slug: f.slug },
	});
	expect(r.status).toBe(200);
	expect(await r.json()).toEqual({ ok: true });
	expect(responseCookies(r)[0]).toContain("__Host-guest_token=");
});
