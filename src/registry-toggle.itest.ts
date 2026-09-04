import { randomUUID } from "node:crypto";
import { Pool } from "@neondatabase/serverless";
import { afterAll, expect, test } from "vitest";
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
import { DELETE as cancelAsOrganizer } from "../app/api/events/[eventId]/gifts/[giftId]/reservation/route";
import {
	DELETE as cancelAsGuest,
	POST as reserveGift,
} from "../app/api/public/[slug]/gifts/[giftId]/reservation/route";
import { GET as publicEvent } from "../app/api/public/[slug]/route";

const url = process.env.DATABASE_URL_TEST;
if (!url)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: url });
afterAll(async () => {
	await pool.end();
});

async function withEvent<T>(
	run: (event: EventFixture) => Promise<T>,
): Promise<T> {
	const event = await createOrganizerSession(pool);
	try {
		return await run(event);
	} finally {
		await destroyFixture(pool, event);
	}
}

async function insertGift(eventId: string, title = "Registry gift") {
	const id = randomUUID();
	await pool.query(
		"insert into gifts (id,event_id,title,position) values ($1,$2,$3,0)",
		[id, eventId, title],
	);
	return id;
}

async function reservation(
	handler: typeof reserveGift | typeof cancelAsGuest,
	event: EventFixture,
	giftId: string,
	cookie: string,
) {
	return callParameterizedRoute(handler, {
		path: `/api/public/${event.slug}/gifts/${giftId}/reservation`,
		method: handler === reserveGift ? "POST" : "DELETE",
		headers: { cookie },
		params: { slug: event.slug, giftId },
	});
}

test("a disabled registry is absent from the anonymous loader payload and does not query gifts", async () => {
	await withEvent(async (event) => {
		const title = "Private registry gift title";
		await pool.query(
			"update events set gift_registry_enabled=false where id=$1",
			[event.eventId],
		);
		await insertGift(event.eventId, title);
		const guest = await createGuestSession(pool, event);
		const payload = await callParameterizedRoute(publicEvent, {
			path: `/api/public/${event.slug}`,
			headers: { cookie: guest.cookie },
			params: { slug: event.slug },
		});
		expect(payload.status).toBe(200);
		expect(JSON.stringify(await payload.json())).not.toContain(title);
		await pool.query("alter table gifts rename to registry_toggle_gifts_probe");
		try {
			const noQuery = await callParameterizedRoute(publicEvent, {
				path: `/api/public/${event.slug}`,
				headers: { cookie: guest.cookie },
				params: { slug: event.slug },
			});
			expect(noQuery.status).toBe(200);
			expect(await noQuery.json()).toMatchObject({ gifts: [] });
		} finally {
			await pool.query(
				"alter table registry_toggle_gifts_probe rename to gifts",
			);
		}
	});
});

test("an enabled registry retains gift data in the anonymous loader payload", async () => {
	await withEvent(async (event) => {
		await insertGift(event.eventId, "Enabled registry gift");
		const guest = await createGuestSession(pool, event);
		const response = await callParameterizedRoute(publicEvent, {
			path: `/api/public/${event.slug}`,
			headers: { cookie: guest.cookie },
			params: { slug: event.slug },
		});
		expect(response.status).toBe(200);
		expect(await response.json()).toMatchObject({
			gifts: [expect.objectContaining({ title: "Enabled registry gift" })],
		});
	});
});

test("reserveGift rejects a disabled registry without persisting a reservation", async () => {
	await withEvent(async (event) => {
		const guest = await createGuestSession(pool, event);
		const giftId = await insertGift(event.eventId);
		await pool.query(
			"update events set gift_registry_enabled=false where id=$1",
			[event.eventId],
		);
		const response = await reservation(
			reserveGift,
			event,
			giftId,
			guest.cookie,
		);
		expect(await response.json()).toEqual({
			ok: false,
			error: { code: "invalid_or_expired_link" },
		});
		expect(
			(
				await pool.query("select id from gift_reservations where gift_id=$1", [
					giftId,
				])
			).rowCount,
		).toBe(0);
	});
});

test("reserveGift persists a reservation when the registry is enabled", async () => {
	await withEvent(async (event) => {
		const guest = await createGuestSession(pool, event);
		const giftId = await insertGift(event.eventId);
		const response = await reservation(
			reserveGift,
			event,
			giftId,
			guest.cookie,
		);
		expect(await response.json()).toEqual({ ok: true, giftId });
		expect(
			(
				await pool.query("select id from gift_reservations where gift_id=$1", [
					giftId,
				])
			).rowCount,
		).toBe(1);
	});
});

test("cancelReservation rejects a disabled registry without cancelling an active reservation", async () => {
	await withEvent(async (event) => {
		const guest = await createGuestSession(pool, event);
		const giftId = await insertGift(event.eventId);
		await reservation(reserveGift, event, giftId, guest.cookie);
		await pool.query(
			"update events set gift_registry_enabled=false where id=$1",
			[event.eventId],
		);
		const response = await reservation(
			cancelAsGuest,
			event,
			giftId,
			guest.cookie,
		);
		expect(await response.json()).toEqual({
			ok: false,
			error: { code: "invalid_or_expired_link" },
		});
		expect(
			(
				await pool.query(
					"select cancelled_at from gift_reservations where gift_id=$1",
					[giftId],
				)
			).rows[0]?.cancelled_at,
		).toBeNull();
	});
});

test.each([
	"owner",
	"editor",
])("an %s can cancel a reservation while the registry is disabled", async (role) => {
	await withEvent(async (event) => {
		const guest = await createGuestSession(pool, event);
		const giftId = await insertGift(event.eventId);
		await reservation(reserveGift, event, giftId, guest.cookie);
		const organizer =
			role === "owner" ? event : await createOrganizerSession(pool);
		try {
			if (role === "editor")
				await pool.query(
					"insert into event_memberships (event_id,user_id,role) values ($1,$2,'editor')",
					[event.eventId, organizer.userId],
				);
			await pool.query(
				"update events set gift_registry_enabled=false where id=$1",
				[event.eventId],
			);
			const response = await callParameterizedJsonRoute(cancelAsOrganizer, {
				path: `/api/events/${event.eventId}/gifts/${giftId}/reservation`,
				method: "DELETE",
				headers: { cookie: organizer.cookie },
				body: {},
				params: { eventId: event.eventId, giftId },
			});
			expect(await response.json()).toEqual({ ok: true, giftId });
			expect(
				(
					await pool.query(
						"select cancelled_at from gift_reservations where gift_id=$1",
						[giftId],
					)
				).rows[0]?.cancelled_at,
			).not.toBeNull();
		} finally {
			if (organizer !== event) {
				await pool.query("delete from audit_log where actor_user_id=$1", [
					organizer.userId,
				]);
				await destroyFixture(pool, organizer);
			}
		}
	});
});
