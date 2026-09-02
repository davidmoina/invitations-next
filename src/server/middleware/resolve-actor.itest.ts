import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
	createGuestSession,
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { callParameterizedJsonRoute } from "#/test/route-handler";
import { POST as rsvp } from "../../../app/api/public/[slug]/rsvp/route";

const databaseUrl = process.env.DATABASE_URL_TEST;
if (!databaseUrl)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: databaseUrl });
let first: EventFixture;
let second: EventFixture;

beforeAll(async () => {
	first = await createOrganizerSession(pool);
	second = await createOrganizerSession(pool);
}, 30_000);
afterAll(async () => {
	await destroyFixture(pool, first);
	await destroyFixture(pool, second);
	await pool.end();
});

describe("guest actor resolution at HTTP routes", () => {
	test("does not accept a self-describing guest token outside its event URL scope", async () => {
		const guest = await createGuestSession(pool, first);
		const response = await callParameterizedJsonRoute(rsvp, {
			path: `/api/public/${second.slug}/rsvp`,
			method: "POST",
			headers: { cookie: guest.cookie },
			body: { attending: true, companions: 0 },
			params: { slug: second.slug },
		});
		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ code: "unauthorized" });
		const result = await pool.query(
			"select attending from guests where id = $1",
			[guest.guestId],
		);
		expect(result.rows).toEqual([{ attending: null }]);
	});
});
