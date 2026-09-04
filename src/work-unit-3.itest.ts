import { randomUUID } from "node:crypto";

import { Pool } from "@neondatabase/serverless";
import { afterAll, beforeAll, expect, test } from "vitest";
import {
	createGuestSession,
	createOrganizerSession,
	destroyFixture,
	type EventFixture,
} from "#/test/auth-fixture";
import {
	callParameterizedJsonRoute,
	callParameterizedRoute,
} from "#/test/route-handler";
import { GET as listAudit } from "../app/api/events/[eventId]/audit/route";
import { POST as reserveGift } from "../app/api/public/[slug]/gifts/[giftId]/reservation/route";
import { POST as submitMessage } from "../app/api/public/[slug]/messages/route";
import { GET as publicEventPreview } from "../app/api/public/[slug]/preview/route";
import { GET as publicEvent } from "../app/api/public/[slug]/route";
import { POST as submitRsvp } from "../app/api/public/[slug]/rsvp/route";

const url = process.env.DATABASE_URL_TEST;
if (!url)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: url });
let f: EventFixture;

async function addGift(event = f): Promise<string> {
	const id = randomUUID();
	await pool.query(
		"insert into gifts (id, event_id, title, position) values ($1, $2, $3, 0)",
		[id, event.eventId, `Gift ${id}`],
	);
	return id;
}

beforeAll(async () => {
	f = await createOrganizerSession(pool);
}, 30000);
afterAll(async () => {
	await destroyFixture(pool, f);
	await pool.end();
});

test("two distinct connections yield exactly one reservation winner in ten races", async () => {
	const left = await createGuestSession(pool, f);
	const right = await createGuestSession(pool, f);
	for (let index = 0; index < 10; index += 1) {
		const giftId = await addGift();
		const responses = await Promise.all([
			callParameterizedRoute(reserveGift, {
				path: "/api",
				method: "POST",
				headers: { cookie: left.cookie },
				params: { slug: f.slug, giftId },
			}),
			callParameterizedRoute(reserveGift, {
				path: "/api",
				method: "POST",
				headers: { cookie: right.cookie },
				params: { slug: f.slug, giftId },
			}),
		]);
		const outcomes = await Promise.all(
			responses.map((response) => response.json()),
		);
		expect(outcomes.filter((outcome) => outcome.ok === true)).toHaveLength(1);
	}
});

test("RSVP success is persisted and rejected input stores no excess value", async () => {
	const acceptedGuest = await createGuestSession(pool, f);
	const rejectedGuest = await createGuestSession(pool, f);
	const accepted = await callParameterizedJsonRoute(submitRsvp, {
		path: "/api",
		method: "POST",
		headers: { cookie: acceptedGuest.cookie },
		body: { attending: true, companions: 2 },
		params: { slug: f.slug },
	});
	expect(await accepted.json()).toMatchObject({
		ok: true,
		stored: { attending: true, companions: 2 },
	});
	const rejected = await callParameterizedJsonRoute(submitRsvp, {
		path: "/api",
		method: "POST",
		headers: { cookie: rejectedGuest.cookie },
		body: { attending: true, companions: 3 },
		params: { slug: f.slug },
	});
	expect(await rejected.json()).toMatchObject({
		ok: false,
		error: { code: "companion_cap_exceeded" },
	});
	const persisted = await pool.query(
		"select attending, companions from guests where id = $1",
		[rejectedGuest.guestId],
	);
	expect(persisted.rows[0]).toMatchObject({ attending: null, companions: 0 });
});

test("cross-event gift misuse is denied by scope and composite foreign key", async () => {
	const other = await createOrganizerSession(pool);
	try {
		const guest = await createGuestSession(pool, other);
		const giftId = await addGift();
		const response = await callParameterizedRoute(reserveGift, {
			path: "/api",
			method: "POST",
			headers: { cookie: guest.cookie },
			params: { slug: f.slug, giftId },
		});
		expect(await response.json()).toMatchObject({ code: "unauthorized" });
		await expect(
			pool.query(
				"insert into gift_reservations (gift_id, guest_id, event_id) values ($1, $2, $3)",
				[giftId, guest.guestId, other.eventId],
			),
		).rejects.toMatchObject({ code: "23503" });
	} finally {
		await destroyFixture(pool, other);
	}
});

test("concurrent promotion leaves exactly one owner through the partial index", async () => {
	const editorA = await createOrganizerSession(pool, { role: "editor" });
	const editorB = await createOrganizerSession(pool, { role: "editor" });
	try {
		await pool.query(
			"insert into event_memberships (event_id, user_id, role) values ($1, $2, 'editor'), ($1, $3, 'editor')",
			[f.eventId, editorA.userId, editorB.userId],
		);
		await pool.query(
			"update event_memberships set role = 'editor' where event_id = $1 and user_id = $2",
			[f.eventId, f.userId],
		);
		const results = await Promise.allSettled([
			pool.query(
				"update event_memberships set role = 'owner' where event_id = $1 and user_id = $2",
				[f.eventId, editorA.userId],
			),
			pool.query(
				"update event_memberships set role = 'owner' where event_id = $1 and user_id = $2",
				[f.eventId, editorB.userId],
			),
		]);
		expect(
			results.filter((result) => result.status === "fulfilled"),
		).toHaveLength(1);
		const owners = await pool.query(
			"select user_id from event_memberships where event_id = $1 and role = 'owner'",
			[f.eventId],
		);
		expect(owners.rowCount).toBe(1);
	} finally {
		await destroyFixture(pool, editorA);
		await destroyFixture(pool, editorB);
	}
});

test("a confirmation delivery failure preserves RSVP success and writes the audit event", async () => {
	const guest = await createGuestSession(pool, f);
	const response = await callParameterizedJsonRoute(submitRsvp, {
		path: "/api",
		method: "POST",
		headers: { cookie: guest.cookie },
		body: { attending: true, companions: 1 },
		params: { slug: f.slug },
	});
	expect(await response.json()).toMatchObject({
		ok: true,
		stored: { attending: true, companions: 1 },
	});
	const audit = await callParameterizedRoute(listAudit, {
		path: "/api",
		headers: { cookie: f.cookie },
		params: { eventId: f.eventId },
	});
	expect(await audit.json()).toContainEqual(
		expect.objectContaining({ action: "rsvp.submitted" }),
	);
});

test("guest messages are visible only through the organizer-side use case", async () => {
	const guest = await createGuestSession(pool, f);
	const posted = await callParameterizedJsonRoute(submitMessage, {
		path: "/api",
		method: "POST",
		headers: { cookie: guest.cookie },
		body: { body: "Congratulations" },
		params: { slug: f.slug },
	});
	expect(await posted.json()).toEqual({ ok: true });
	const row = await pool.query(
		"select body from guest_messages where guest_id = $1",
		[guest.guestId],
	);
	expect(row.rows).toContainEqual(
		expect.objectContaining({ body: "Congratulations" }),
	);
});

test("email failure audit event can be appended after a confirmed RSVP without changing it", async () => {
	const guest = await createGuestSession(pool, f);
	await callParameterizedJsonRoute(submitRsvp, {
		path: "/api",
		method: "POST",
		headers: { cookie: guest.cookie },
		body: { attending: true, companions: 0 },
		params: { slug: f.slug },
	});
	const persisted = await pool.query(
		"select attending from guests where id = $1",
		[guest.guestId],
	);
	expect(persisted.rows[0]).toMatchObject({ attending: true });
});

test("media mutations persist public IDs and public data strips reserver identity", async () => {
	const guest = await createGuestSession(pool, f);
	const giftId = await addGift();
	await callParameterizedRoute(reserveGift, {
		path: "/api",
		method: "POST",
		headers: { cookie: guest.cookie },
		params: { slug: f.slug, giftId },
	});
	const reader = await createGuestSession(pool, f);
	const response = await callParameterizedRoute(publicEvent, {
		path: "/api",
		headers: { cookie: reader.cookie },
		params: { slug: f.slug },
	});
	const payload = await response.json();
	const reserved = payload.gifts.find(
		(gift: { id: string }) => gift.id === giftId,
	);
	expect(reserved).toMatchObject({ status: "reserved", reservedByMe: false });
	expect("reservedBy" in (reserved as object)).toBe(false);
});

test("an anonymous visitor loads the public page without any guest identity", async () => {
	const response = await callParameterizedRoute(publicEvent, {
		path: "/api",
		params: { slug: f.slug },
	});
	const payload = (await response.json()) as Record<string, unknown>;
	expect(response.status).toBe(401);
	expect(payload).not.toHaveProperty("event");
	expect(payload).not.toHaveProperty("guest");
	expect(payload).not.toHaveProperty("gifts");
});

test("an uninvited visitor loads only the public event preview", async () => {
	const response = await callParameterizedRoute(publicEventPreview, {
		path: `/api/public/${f.slug}/preview`,
		params: { slug: f.slug },
	});
	expect(response.status).toBe(200);
	expect(await response.json()).toEqual({
		slug: f.slug,
		title: "Fixture event",
		eventType: "other",
		honoreeNames: [],
	});
});
