import { randomUUID } from "node:crypto";
import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, expect, test } from "vitest";

const url = process.env.DATABASE_URL_TEST;
if (!url)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: url });
const userId = randomUUID();
beforeAll(async () => {
	await pool.query(
		'insert into "user" (id,name,email,email_verified,updated_at) values ($1,$2,$3,true,now())',
		[userId, "constraint", `${userId}@example.test`],
	);
});
afterAll(async () => {
	await pool.query('delete from "user" where id=$1', [userId]);
	await pool.end();
});
test("database event type checks reject invalid persisted combinations", async () => {
	await expect(
		pool.query(
			"insert into events (id,slug,title,event_type,starts_at,timezone,created_by,baby_sex) values ($1,$2,'x','wedding','2030-01-01','UTC',$3,'girl')",
			[randomUUID(), `constraint-${randomUUID()}`, userId],
		),
	).rejects.toMatchObject({ code: "23514" });
});
