import { Pool } from "@neondatabase/serverless";
import { afterAll, expect, test } from "vitest";
import { createOrganizerSession, destroyFixture } from "#/test/auth-fixture";
import { callRoute } from "#/test/route-handler";
import { GET } from "../app/api/events/route";

const url = process.env.DATABASE_URL_TEST;
if (!url)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: url });

afterAll(async () => {
	await pool.end();
});

test("an organizer receives owner and editor events with their roles and guest counts", async () => {
	const ownerEvent = await createOrganizerSession(pool, { role: "owner" });
	const editorEvent = await createOrganizerSession(pool, { role: "owner" });

	try {
		await pool.query(
			"insert into event_memberships (event_id, user_id, role) values ($1, $2, 'editor')",
			[editorEvent.eventId, ownerEvent.userId],
		);
		await pool.query("update events set starts_at = $1 where id = $2", [
			"2031-06-12T17:00:00.000Z",
			ownerEvent.eventId,
		]);
		await pool.query("update events set starts_at = $1 where id = $2", [
			"2030-06-12T17:00:00.000Z",
			editorEvent.eventId,
		]);
		await pool.query(
			"insert into guests (event_id, display_name, name_normalized, source, attending, companions) values ($1, 'Owner guest', 'owner guest', 'preloaded', true, 0), ($1, 'Pending guest', 'pending guest', 'preloaded', null, 0), ($2, 'Editor guest', 'editor guest', 'preloaded', true, 0)",
			[ownerEvent.eventId, editorEvent.eventId],
		);

		const response = await callRoute(GET, {
			path: "/api/events",
			headers: { cookie: ownerEvent.cookie },
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([
			{
				id: ownerEvent.eventId,
				slug: ownerEvent.slug,
				title: "Fixture event",
				startsAt: "2031-06-12T17:00:00.000Z",
				status: "draft",
				role: "owner",
				guestCount: 2,
				attendingCount: 1,
			},
			{
				id: editorEvent.eventId,
				slug: editorEvent.slug,
				title: "Fixture event",
				startsAt: "2030-06-12T17:00:00.000Z",
				status: "draft",
				role: "editor",
				guestCount: 1,
				attendingCount: 1,
			},
		]);
	} finally {
		await pool.query("delete from guests where event_id = any($1::uuid[])", [
			[ownerEvent.eventId, editorEvent.eventId],
		]);
		await destroyFixture(pool, ownerEvent);
		await destroyFixture(pool, editorEvent);
	}
});

test("the organizer events handler body returns an empty list for a user without memberships", async () => {
	const session = await createOrganizerSession(pool, { role: "owner" });

	try {
		await pool.query("delete from event_memberships where user_id = $1", [
			session.userId,
		]);
		const response = await callRoute(GET, {
			path: "/api/events",
			headers: { cookie: session.cookie },
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
	} finally {
		await destroyFixture(pool, session);
	}
});
