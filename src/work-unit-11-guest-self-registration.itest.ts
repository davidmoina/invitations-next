import { randomUUID } from "node:crypto";

import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import {
	callParameterizedJsonRoute,
	responseCookies,
} from "#/test/route-handler";
import { POST as registerGuest } from "../app/api/public/[slug]/guests/route";

const url = process.env.DATABASE_URL_TEST;
if (!url)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: url });
let fixture: EventFixture;
beforeAll(async () => {
	fixture = await createOrganizerSession(pool);
}, 30_000);
afterAll(async () => {
	await destroyFixture(pool, fixture);
	await pool.end();
});

function register(input: { displayName: string; email: string | null }) {
	return callParameterizedJsonRoute(registerGuest, {
		path: `/api/public/${fixture.slug}/guests`,
		method: "POST",
		body: input,
		params: { slug: fixture.slug },
	});
}

async function eventRowCounts(): Promise<{ guests: number; tokens: number }> {
	const [guests, tokens] = await Promise.all([
		pool.query(
			"select count(*)::int as count from guests where event_id = $1",
			[fixture.eventId],
		),
		pool.query(
			"select count(*)::int as count from guest_tokens where event_id = $1",
			[fixture.eventId],
		),
	]);
	return {
		guests: Number(guests.rows[0]?.count),
		tokens: Number(tokens.rows[0]?.count),
	};
}

describe("disabled guest self-registration route", () => {
	test("a brand-new email receives the gone error", async () => {
		const response = await register({
			displayName: "Elena Rodriguez",
			email: "elena@example.test",
		});

		expect(response.status).toBe(410);
		expect(await response.json()).toEqual({ code: "gone" });
	});

	test("a brand-new email receives no guest cookie", async () => {
		const response = await register({
			displayName: "No Cookie Guest",
			email: "no-cookie@example.test",
		});

		expect(response.status).toBe(410);
		expect(responseCookies(response)).toEqual([]);
	});

	test("a brand-new email creates neither a guest nor a token", async () => {
		const before = await eventRowCounts();
		const response = await register({
			displayName: "No Row Guest",
			email: "no-row@example.test",
		});

		expect(response.status).toBe(410);
		expect(await eventRowCounts()).toEqual(before);
	});

	test("a matching preloaded guest cannot be used to obtain an invited identity", async () => {
		await pool.query(
			"insert into guests (id, event_id, display_name, name_normalized, email, source) values ($1, $2, $3, $4, $5, $6)",
			[
				randomUUID(),
				fixture.eventId,
				"Ana Ruiz",
				"ana ruiz",
				"ana@example.test",
				"public_link",
			],
		);

		// Prevents reconciliation from turning a known name and email into this guest's session.
		const response = await register({
			displayName: "Ana Ruiz",
			email: "ana@example.test",
		});

		expect(response.status).toBe(410);
		expect(await response.json()).toEqual({ code: "gone" });
		expect(responseCookies(response)).toEqual([]);
	});

	test("a matching preloaded guest leaves guest and token rows unchanged", async () => {
		await pool.query(
			"insert into guests (id, event_id, display_name, name_normalized, email, source) values ($1, $2, $3, $4, $5, $6)",
			[
				randomUUID(),
				fixture.eventId,
				"Marta Flores",
				"marta flores",
				"marta@example.test",
				"public_link",
			],
		);
		const before = await eventRowCounts();
		const response = await register({
			displayName: "Marta Flores",
			email: "marta@example.test",
		});

		expect(response.status).toBe(410);
		expect(responseCookies(response)).toEqual([]);
		expect(await eventRowCounts()).toEqual(before);
	});
});
