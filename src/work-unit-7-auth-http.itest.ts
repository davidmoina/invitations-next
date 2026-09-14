import { randomUUID } from "node:crypto";
import { Pool } from "@neondatabase/serverless";
import { afterAll, expect, test } from "vitest";
import { callJsonRoute } from "#/test/route-handler";
import { POST } from "../app/api/auth/[...all]/route";

const url = process.env.DATABASE_URL_TEST;
if (!url)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: url });
const email = `http-auth-${randomUUID()}@example.test`;
afterAll(async () => {
	await pool.query('delete from "user" where email=$1', [email]);
	await pool.end();
});
test("sign-up travels through Better Auth's HTTP route and creates a free profile", async () => {
	const r = await callJsonRoute(POST, {
		path: "/api/auth/sign-up/email",
		method: "POST",
		body: { name: "HTTP", email, password: randomUUID() },
	});
	expect(r.ok).toBe(true);
	const body = (await r.json()) as { user: { id: string } };
	const profile = await pool.query(
		"select plan from organizer_profile where user_id=$1",
		[body.user.id],
	);
	expect(profile.rows).toEqual([{ plan: "free" }]);
});
