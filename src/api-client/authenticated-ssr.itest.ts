import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { GET } from "../../app/api/events/route";

const databaseUrl = process.env.DATABASE_URL_TEST;
if (!databaseUrl)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: databaseUrl });

let organizer: EventFixture;

beforeAll(async () => {
	organizer = await createOrganizerSession(pool);
}, 30_000);

afterAll(async () => {
	await destroyFixture(pool, organizer);
	await pool.end();
});

describe("authenticated SSR HTTP boundary", () => {
	test("forwards the document cookie into the real organizer handler", async () => {
		const response = await GET(
			new Request("https://app.test/api/events", {
				headers: { cookie: organizer.cookie },
			}),
		);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: organizer.eventId }),
			]),
		);
	});
});
