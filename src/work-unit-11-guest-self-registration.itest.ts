import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import { hashToken } from "#/guests/tokens";
import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import {
	callParameterizedJsonRoute,
	callParameterizedRoute,
	responseCookies,
} from "#/test/route-handler";
import { POST as registerGuest } from "../app/api/public/[slug]/guests/route";
import { GET as publicEvent } from "../app/api/public/[slug]/route";

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

function tokenFrom(response: Response): string {
	const token = responseCookies(response)
		.flatMap((cookie) => cookie.split(";"))
		.find((part) => part.startsWith("__Host-guest_token="))
		?.slice("__Host-guest_token=".length);
	if (!token) throw new Error("Guest cookie was not set");
	return token;
}

describe("guest self-registration through the public route", () => {
	test("a new email creates a public-link guest, issues a secure token, and sets the guest cookie", async () => {
		const response = await register({
			displayName: "Elena Rodriguez",
			email: "elena@example.test",
		});
		expect(response.status).toBe(200);
		expect(await response.clone().json()).toEqual({ ok: true });
		const token = tokenFrom(response);
		const guests = await pool.query(
			"select id, display_name, source, email from guests where event_id = $1",
			[fixture.eventId],
		);
		expect(guests.rows).toEqual([
			expect.objectContaining({
				display_name: "Elena Rodriguez",
				source: "public_link",
				email: "elena@example.test",
			}),
		]);
		const tokens = await pool.query(
			"select token_hash from guest_tokens where guest_id = $1 and event_id = $2",
			[guests.rows[0]?.id, fixture.eventId],
		);
		expect(tokens.rows).toEqual([
			expect.objectContaining({ token_hash: await hashToken(token) }),
		]);
		expect(responseCookies(response).join(";")).toContain("HttpOnly");
		expect(responseCookies(response).join(";")).toContain("Secure");
		expect(responseCookies(response).join(";")).toContain("SameSite=lax");
		const page = await callParameterizedRoute(publicEvent, {
			path: `/api/public/${fixture.slug}`,
			headers: { cookie: `__Host-guest_token=${token}` },
			params: { slug: fixture.slug },
		});
		expect(
			(await page.json()) as { guest: { displayName: string } },
		).toMatchObject({
			guest: { displayName: "Elena Rodriguez" },
		});
	});

	test("a matching email+name reconciles onto the pre-loaded guest with no duplicate", async () => {
		const first = await register({
			displayName: "Ana Ruiz",
			email: "ana@example.test",
		});
		expect(first.status).toBe(200);
		const before = await pool.query(
			"select id from guests where event_id = $1 and email = $2",
			[fixture.eventId, "ana@example.test"],
		);
		const second = await register({
			displayName: "Ana Ruiz",
			email: "ana@example.test",
		});
		expect(second.status).toBe(200);
		const after = await pool.query(
			"select id from guests where event_id = $1 and email = $2",
			[fixture.eventId, "ana@example.test"],
		);
		expect(after.rows).toHaveLength(1);
		expect(after.rows[0]?.id).toBe(before.rows[0]?.id);
	});

	test("the same email with a different name creates a distinguishable second guest", async () => {
		await register({
			displayName: "Marta Flores",
			email: "shared@example.test",
		});
		const second = await register({
			displayName: "Marta Ruiz",
			email: "shared@example.test",
		});
		expect(second.status).toBe(200);
		const guests = await pool.query(
			"select id, display_name from guests where event_id = $1 and email = $2 order by created_at",
			[fixture.eventId, "shared@example.test"],
		);
		expect(guests.rows).toHaveLength(2);
		expect(guests.rows.map((guest) => guest.display_name)).toEqual([
			"Marta Flores",
			"Marta Ruiz",
		]);
	});

	test("the serialized public response for a known email is byte-identical to an unknown email", async () => {
		await register({ displayName: "Known Guest", email: "known@example.test" });
		const known = await register({
			displayName: "Known Guest",
			email: "known@example.test",
		});
		const unknown = await register({
			displayName: "Unknown Guest",
			email: "unknown@example.test",
		});
		expect(await known.text()).toBe(await unknown.text());
	});

	test("concurrent same-identity registrations reconcile to one guest without exposing a unique-constraint error", async () => {
		const responses = await Promise.all(
			Array.from({ length: 5 }, () =>
				register({
					displayName: "Concurrent Guest",
					email: "concurrent@example.test",
				}),
			),
		);
		expect(responses.map((response) => response.status)).toEqual([
			200, 200, 200, 200, 200,
		]);
		expect(
			await Promise.all(responses.map((response) => response.text())),
		).toEqual([
			'{"ok":true}',
			'{"ok":true}',
			'{"ok":true}',
			'{"ok":true}',
			'{"ok":true}',
		]);
		const guests = await pool.query(
			"select id from guests where event_id = $1 and email = $2 and name_normalized = $3",
			[fixture.eventId, "concurrent@example.test", "concurrent guest"],
		);
		expect(guests.rows).toHaveLength(1);
	});
});
