import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, expect, test } from "vitest";
import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { eventInput } from "#/test/event-input";
import { callJsonRoute } from "#/test/route-handler";
import { POST } from "../app/api/events/route";

const url = process.env.DATABASE_URL_TEST;
if (!url)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: url });
let fixture: EventFixture;
beforeAll(async () => {
	fixture = await createOrganizerSession(pool);
}, 30000);
afterAll(async () => {
	await pool.query("delete from audit_log where actor_user_id=$1", [
		fixture.userId,
	]);
	await pool.query("delete from events where created_by=$1", [fixture.userId]);
	await destroyFixture(pool, fixture);
	await pool.end();
});

async function create(
	body: unknown = eventInput({ title: `Event ${crypto.randomUUID()}` }),
	cookie = fixture.cookie,
) {
	return callJsonRoute(POST, {
		path: "/api/events",
		method: "POST",
		headers: { cookie },
		body,
	});
}

test("creating an event records the creator as its single owner", async () => {
	const response = await create();
	expect(response.status).toBe(200);
	const created = (await response.json()) as { id: string };
	const memberships = await pool.query(
		"select user_id, role from event_memberships where event_id=$1",
		[created.id],
	);
	expect(memberships.rows).toEqual([
		{ user_id: fixture.userId, role: "owner" },
	]);
});

test("creation is attributed to the organizer in the same transaction", async () => {
	const response = await create();
	const created = (await response.json()) as { id: string };
	const audit = await pool.query(
		"select action, actor_user_id from audit_log where event_id=$1 order by action",
		[created.id],
	);
	expect(audit.rows).toEqual(
		expect.arrayContaining([
			{ action: "event.created", actor_user_id: fixture.userId },
			{ action: "membership.created", actor_user_id: fixture.userId },
		]),
	);
});

test("an actor that is not the owner cannot create an event", async () => {
	const response = await create({ ...eventInput(), status: "published" });
	expect(response.status).toBe(400);
});

test("two events with the same title get distinct slugs", async () => {
	const input = eventInput({ title: "Same title" });
	const first = (await create(input)).clone();
	const second = await create(input);
	const one = (await first.json()) as { slug: string };
	const two = (await second.json()) as { slug: string };
	expect(one.slug).not.toBe(two.slug);
});

test("the create-event validator accepts the form payload and nothing more", async () => {
	const accepted = await create(eventInput());
	const extra = await create({ ...eventInput(), status: "published" });
	const malformed = await create({
		...eventInput(),
		startsAt: "2030-06-12T17:00",
	});
	expect(accepted.status).toBe(200);
	expect(extra.status).toBe(400);
	expect(malformed.status).toBe(400);
});

test("the create-event handler path creates an event for the signed-in user", async () => {
	const response = await create(eventInput({ title: "Handler event" }));
	const created = (await response.json()) as { id: string };
	const event = await pool.query(
		"select title, created_by from events where id=$1",
		[created.id],
	);
	expect(event.rows).toEqual([
		{ title: "Handler event", created_by: fixture.userId },
	]);
});

test("the create-event handler path rejects a request with no session", async () => {
	const response = await callJsonRoute(POST, {
		path: "/api/events",
		method: "POST",
		body: eventInput(),
	});
	expect(response.status).toBe(401);
});
