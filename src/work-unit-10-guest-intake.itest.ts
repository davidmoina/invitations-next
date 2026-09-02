import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";

import { hashToken } from "#/guests/tokens";
import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { callParameterizedJsonRoute } from "#/test/route-handler";
import { POST as addGuests } from "../app/api/events/[eventId]/guests/route";

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

function add(input: { displayName: string; email: string | null }) {
	return callParameterizedJsonRoute(addGuests, {
		path: `/api/events/${fixture.eventId}/guests`,
		method: "POST",
		headers: { cookie: fixture.cookie },
		body: { guests: [input] },
		params: { eventId: fixture.eventId },
	});
}

describe("guest intake through the organizer route", () => {
	test("pre-loading a guest stores only a valid, unrevoked token hash", async () => {
		const response = await add({
			displayName: "Ana Ruiz",
			email: "ana@example.test",
		});
		expect(response.status).toBe(200);
		const [guest] = (await response.json()) as Array<{
			id: string;
			token: string;
		}>;
		if (!guest) throw new Error("Expected pre-loaded guest");
		const tokens = await pool.query(
			"select token_hash, expires_at, revoked_at from guest_tokens where guest_id = $1 and event_id = $2",
			[guest.id, fixture.eventId],
		);
		expect(tokens.rows).toEqual([
			expect.objectContaining({
				token_hash: await hashToken(guest.token),
				revoked_at: null,
			}),
		]);
		expect(
			new Date(tokens.rows[0]?.expires_at as string).getTime(),
		).toBeGreaterThan(Date.now());
		expect(new Date(tokens.rows[0]?.expires_at as string).toISOString()).toBe(
			"2030-01-31T00:00:00.000Z",
		);
	});

	test("guest-link delivery sends the issued event link through the route mailer", async () => {
		const delivery = await import("#/guests/delivery");
		const send = vi
			.spyOn(delivery, "sendGuestLinkEmail")
			.mockResolvedValue(undefined);
		try {
			const response = await add({
				displayName: "Mailer Guest",
				email: "mailer@example.test",
			});
			expect(response.status).toBe(200);
			const [guest] = (await response.json()) as Array<{ token: string }>;
			expect(send).toHaveBeenCalledWith(
				expect.objectContaining({ eventId: fixture.eventId }),
				expect.objectContaining({
					email: "mailer@example.test",
					eventSlug: fixture.slug,
					token: guest?.token,
				}),
			);
		} finally {
			send.mockRestore();
		}
	});
});
