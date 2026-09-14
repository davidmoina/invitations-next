import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, expect, test } from "vitest";
import {
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import { eventInput } from "#/test/event-input";
import {
	callJsonRoute,
	callParameterizedJsonRoute,
	callParameterizedRoute,
} from "#/test/route-handler";
import { GET, PATCH } from "../app/api/events/[eventId]/route";
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
	await pool.query("delete from audit_log where actor_user_id = $1", [
		fixture.userId,
	]);
	await pool.query("delete from events where created_by = $1", [
		fixture.userId,
	]);
	await destroyFixture(pool, fixture);
	await pool.end();
});

async function create(body: unknown) {
	return callJsonRoute(POST, {
		path: "/api/events",
		method: "POST",
		headers: { cookie: fixture.cookie },
		body,
	});
}

async function eventId(
	body = eventInput({ title: `typed ${crypto.randomUUID()}` }),
) {
	const response = await create(body);
	expect(response.status).toBe(200);
	return ((await response.json()) as { id: string }).id;
}

async function stored(id: string) {
	return pool.query(
		"select event_type, due_date, baby_sex, turning_age from events where id=$1",
		[id],
	);
}

test("accepts optional baby sex and birthday age", async () => {
	const baby = await eventId(
		eventInput({
			eventType: "baby_shower",
			details: { type: "baby_shower", dueDate: "2030-07-01", babySex: null },
		}),
	);
	const birthday = await eventId(
		eventInput({
			eventType: "birthday",
			details: { type: "birthday", turningAge: null },
		}),
	);
	expect((await stored(baby)).rows[0]).toMatchObject({ baby_sex: null });
	expect((await stored(birthday)).rows[0]).toMatchObject({ turning_age: null });
});

test("persists honorees through the same event structure", async () => {
	const id = await eventId(eventInput({ honoreeNames: ["Alex", "Sam"] }));
	const response = await callParameterizedRoute(GET, {
		path: `/api/events/${id}`,
		headers: { cookie: fixture.cookie },
		params: { eventId: id },
	});
	expect(response.status).toBe(200);
	expect(await response.json()).toMatchObject({
		event: { honoreeNames: ["Alex", "Sam"] },
	});
});

test.each([
	["missing a type", { eventType: undefined }],
	["an out-of-set type", { eventType: "nope" }],
	[
		"a baby shower without a due date",
		{
			eventType: "baby_shower",
			details: { type: "baby_shower", babySex: null },
		},
	],
	[
		"eventType and details.type drift",
		{
			eventType: "baby_shower",
			details: { type: "wedding" },
		},
	],
])("rejects creation %s and writes no event", async (_label, overrides) => {
	const before = await pool.query(
		"select count(*)::int count from events where created_by=$1",
		[fixture.userId],
	);
	const response = await create({ ...eventInput(), ...overrides });
	expect(response.status).toBe(400);
	const after = await pool.query(
		"select count(*)::int count from events where created_by=$1",
		[fixture.userId],
	);
	expect(after.rows).toEqual(before.rows);
});

test("clears stale details across successful type changes", async () => {
	const id = await eventId(
		eventInput({
			eventType: "birthday",
			details: { type: "birthday", turningAge: 40 },
		}),
	);
	for (const input of [
		{
			...eventInput({
				eventType: "baby_shower",
				details: { type: "baby_shower", dueDate: "2030-07-01", babySex: "boy" },
			}),
			status: "draft",
		},
		{
			...eventInput({
				eventType: "birthday",
				details: { type: "birthday", turningAge: null },
			}),
			status: "draft",
		},
		{
			...eventInput({ eventType: "other", details: { type: "other" } }),
			status: "draft",
		},
	]) {
		const response = await callParameterizedJsonRoute(PATCH, {
			path: `/api/events/${id}`,
			method: "PATCH",
			headers: { cookie: fixture.cookie },
			body: input,
			params: { eventId: id },
		});
		expect(response.status).toBe(200);
	}
	expect((await stored(id)).rows[0]).toEqual({
		event_type: "other",
		due_date: null,
		baby_sex: null,
		turning_age: null,
	});
});

test.each([
	[
		"invalid details",
		{
			eventType: "baby_shower",
			details: { type: "baby_shower", babySex: null },
		},
	],
	["an out-of-set type", { eventType: "nope" }],
	[
		"eventType and details.type drift",
		{ eventType: "wedding", details: { type: "birthday", turningAge: 40 } },
	],
	[
		"a type change missing required detail",
		{
			eventType: "baby_shower",
			details: { type: "baby_shower", babySex: null },
		},
	],
])("rejects an edit with %s and preserves stored state", async (_label, overrides) => {
	const id = await eventId(
		eventInput({
			eventType: "birthday",
			details: { type: "birthday", turningAge: 40 },
		}),
	);
	const response = await callParameterizedJsonRoute(PATCH, {
		path: `/api/events/${id}`,
		method: "PATCH",
		headers: { cookie: fixture.cookie },
		body: {
			...eventInput({
				eventType: "birthday",
				details: { type: "birthday", turningAge: 40 },
			}),
			status: "draft",
			...overrides,
		},
		params: { eventId: id },
	});
	expect(response.status).toBe(400);
	expect((await stored(id)).rows[0]).toMatchObject({
		event_type: "birthday",
		turning_age: 40,
	});
});
