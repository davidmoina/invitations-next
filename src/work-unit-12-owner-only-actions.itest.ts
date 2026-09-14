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
import { PATCH as patchGift } from "../app/api/events/[eventId]/gifts/[giftId]/route";
import { POST as createGift } from "../app/api/events/[eventId]/gifts/route";
import { PATCH as patchGuest } from "../app/api/events/[eventId]/guests/[guestId]/route";
import { DELETE, PATCH as patchEvent } from "../app/api/events/[eventId]/route";

const url = process.env.DATABASE_URL_TEST;
if (!url)
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
const pool = new Pool({ connectionString: url });

afterAll(async () => {
	await pool.end();
});

const eventUpdate = {
	title: "Updated title",
	eventType: "wedding",
	honoreeNames: ["Marta", "Luis"],
	details: { type: "wedding" },
	startsAt: "2030-06-12T17:00:00.000Z",
	timezone: "UTC",
	venueName: null,
	venueAddress: null,
	venueMapUrl: null,
	description: null,
	maxCompanions: 2,
	giftRegistryEnabled: true,
	rsvpDeadline: null,
};

async function gift(event: EventFixture): Promise<string> {
	const result = await pool.query(
		"insert into gifts (event_id, title, position) values ($1, 'Original title', 1) returning id",
		[event.eventId],
	);
	return (result.rows[0] as { id: string }).id;
}

async function guest(event: EventFixture): Promise<string> {
	const result = await pool.query(
		"insert into guests (event_id, display_name, name_normalized, source, companions) values ($1, 'Original Guest', 'original guest', 'preloaded', 0) returning id",
		[event.eventId],
	);
	return (result.rows[0] as { id: string }).id;
}

async function archive(event: EventFixture): Promise<Response> {
	return callParameterizedRoute(DELETE, {
		path: "/api/events",
		method: "DELETE",
		headers: { cookie: event.cookie },
		params: { eventId: event.eventId },
	});
}

async function editGift(
	event: EventFixture,
	giftId: string,
	body: Record<string, unknown>,
): Promise<Response> {
	return callParameterizedJsonRoute(patchGift, {
		path: "/api/gifts",
		method: "PATCH",
		headers: { cookie: event.cookie },
		body,
		params: { eventId: event.eventId, giftId },
	});
}

async function editGuest(
	event: EventFixture,
	guestId: string,
	body: Record<string, unknown>,
): Promise<Response> {
	return callParameterizedJsonRoute(patchGuest, {
		path: "/api/guests",
		method: "PATCH",
		headers: { cookie: event.cookie },
		body,
		params: { eventId: event.eventId, guestId },
	});
}

test("deleteEvent is owner-only and archives the event", async () => {
	const owner = await createOrganizerSession(pool);
	const editor = await createOrganizerSession(pool, { role: "editor" });
	await pool.query(
		"insert into event_memberships (event_id,user_id,role) values ($1,$2,'editor')",
		[owner.eventId, editor.userId],
	);
	try {
		expect((await archive({ ...owner, cookie: editor.cookie })).status).toBe(
			403,
		);
		expect((await archive(owner)).status).toBe(204);
		const result = await pool.query("select status from events where id = $1", [
			owner.eventId,
		]);
		expect(result.rows[0]?.status).toBe("archived");
		const audit = await pool.query(
			"select action, actor_user_id from audit_log where event_id=$1 and action='event.archived'",
			[owner.eventId],
		);
		expect(audit.rows).toEqual([
			{ action: "event.archived", actor_user_id: owner.userId },
		]);
	} finally {
		await destroyFixture(pool, owner);
		await destroyFixture(pool, editor);
	}
});

test("updateEvent rejects status archived for both owner and editor", async () => {
	const owner = await createOrganizerSession(pool);
	const editor = await createOrganizerSession(pool, { role: "editor" });
	try {
		for (const event of [owner, editor]) {
			const response = await callParameterizedJsonRoute(patchEvent, {
				path: "/api/events",
				method: "PATCH",
				headers: { cookie: event.cookie },
				body: { ...eventUpdate, status: "archived" },
				params: { eventId: event.eventId },
			});
			expect(response.status).toBe(403);
			const row = await pool.query(
				"select title, status from events where id=$1",
				[event.eventId],
			);
			expect(row.rows[0]).toEqual({ title: "Fixture event", status: "draft" });
		}
	} finally {
		await destroyFixture(pool, owner);
		await destroyFixture(pool, editor);
	}
});

test("an archived event cannot be restored or mutated by owner or editor", async () => {
	const owner = await createOrganizerSession(pool);
	const editor = await createOrganizerSession(pool, { role: "editor" });
	await pool.query(
		"insert into event_memberships (event_id,user_id,role) values ($1,$2,'editor')",
		[owner.eventId, editor.userId],
	);
	try {
		await archive(owner);
		for (const cookie of [owner.cookie, editor.cookie])
			for (const status of ["draft", "published"]) {
				const response = await callParameterizedJsonRoute(patchEvent, {
					path: "/api/events",
					method: "PATCH",
					headers: { cookie },
					body: { ...eventUpdate, status },
					params: { eventId: owner.eventId },
				});
				expect(response.status).toBe(403);
			}
		const row = await pool.query(
			"select title, status from events where id=$1",
			[owner.eventId],
		);
		expect(row.rows[0]).toEqual({ title: "Fixture event", status: "archived" });
	} finally {
		await destroyFixture(pool, owner);
		await destroyFixture(pool, editor);
	}
});

test("editGift rejects mutations for owner and editor when the event is archived", async () => {
	const owner = await createOrganizerSession(pool);
	const editor = await createOrganizerSession(pool, { role: "editor" });
	await pool.query(
		"insert into event_memberships (event_id,user_id,role) values ($1,$2,'editor')",
		[owner.eventId, editor.userId],
	);
	const giftId = await gift(owner);
	try {
		await archive(owner);
		expect(
			(await editGift(owner, giftId, { title: "Hacked owner gift" })).status,
		).toBe(403);
		expect(
			(
				await editGift({ ...owner, cookie: editor.cookie }, giftId, {
					title: "Hacked editor gift",
				})
			).status,
		).toBe(403);
		const row = await pool.query("select title from gifts where id=$1", [
			giftId,
		]);
		expect(row.rows[0]?.title).toBe("Original title");
	} finally {
		await destroyFixture(pool, owner);
		await destroyFixture(pool, editor);
	}
});

test("an editor can edit a gift scoped to their event", async () => {
	const event = await createOrganizerSession(pool, { role: "editor" });
	const giftId = await gift(event);
	try {
		const response = await editGift(event, giftId, {
			title: "Updated gift",
			description: "New description",
			url: "https://example.test/new",
			imagePublicId: "images/new",
			position: 5,
		});
		expect(response.status).toBe(200);
		const row = await pool.query(
			"select title, description, url, image_public_id, position from gifts where id=$1 and event_id=$2",
			[giftId, event.eventId],
		);
		expect(row.rows).toEqual([
			{
				title: "Updated gift",
				description: "New description",
				url: "https://example.test/new",
				image_public_id: "images/new",
				position: 5,
			},
		]);
		const audit = await pool.query(
			"select action, actor_user_id from audit_log where event_id=$1 and action='gift.updated'",
			[event.eventId],
		);
		expect(audit.rows).toEqual([
			{ action: "gift.updated", actor_user_id: event.userId },
		]);
	} finally {
		await destroyFixture(pool, event);
	}
});

test("editGift rejects a gift that belongs to a different event", async () => {
	const eventA = await createOrganizerSession(pool, { role: "editor" });
	const eventB = await createOrganizerSession(pool, { role: "editor" });
	const giftId = await gift(eventA);
	try {
		expect(
			(await editGift(eventB, giftId, { title: "Cross-event edit" })).status,
		).toBe(404);
		const row = await pool.query("select title from gifts where id=$1", [
			giftId,
		]);
		expect(row.rows[0]?.title).toBe("Original title");
	} finally {
		await destroyFixture(pool, eventA);
		await destroyFixture(pool, eventB);
	}
});

test("editGuest rejects mutations for owner and editor when the event is archived", async () => {
	const owner = await createOrganizerSession(pool);
	const editor = await createOrganizerSession(pool, { role: "editor" });
	const guestId = await guest(owner);
	await pool.query(
		"insert into event_memberships (event_id,user_id,role) values ($1,$2,'editor')",
		[owner.eventId, editor.userId],
	);
	try {
		await archive(owner);
		expect(
			(await editGuest(owner, guestId, { displayName: "Hacked owner guest" }))
				.status,
		).toBe(403);
		expect(
			(
				await editGuest({ ...owner, cookie: editor.cookie }, guestId, {
					displayName: "Hacked editor guest",
				})
			).status,
		).toBe(403);
		const row = await pool.query(
			"select display_name from guests where id=$1",
			[guestId],
		);
		expect(row.rows[0]?.display_name).toBe("Original Guest");
	} finally {
		await destroyFixture(pool, owner);
		await destroyFixture(pool, editor);
	}
});

test("an editor can edit a guest scoped to their event", async () => {
	const event = await createOrganizerSession(pool, { role: "editor" });
	const guestId = await guest(event);
	try {
		expect(
			(
				await editGuest(event, guestId, {
					displayName: "Updated Guest",
					email: "updated@example.test",
					attending: true,
					companions: 2,
				})
			).status,
		).toBe(200);
		const row = await pool.query(
			"select display_name, email, email_normalized, name_normalized, attending, companions from guests where id=$1 and event_id=$2",
			[guestId, event.eventId],
		);
		expect(row.rows).toEqual([
			{
				display_name: "Updated Guest",
				email: "updated@example.test",
				email_normalized: "updated@example.test",
				name_normalized: "updated guest",
				attending: true,
				companions: 2,
			},
		]);
		const audit = await pool.query(
			"select action, actor_user_id from audit_log where event_id=$1 and action='guest.updated'",
			[event.eventId],
		);
		expect(audit.rows).toEqual([
			{ action: "guest.updated", actor_user_id: event.userId },
		]);
	} finally {
		await destroyFixture(pool, event);
	}
});

test("editGuest rejects companions above the event cap", async () => {
	const event = await createOrganizerSession(pool, { role: "editor" });
	const guestId = await guest(event);
	try {
		const response = await editGuest(event, guestId, { companions: 5 });
		expect(response.status).toBe(422);
		expect(await response.json()).toEqual({
			code: "companion_cap_exceeded",
			maxCompanions: 2,
		});
		const row = await pool.query("select companions from guests where id=$1", [
			guestId,
		]);
		expect(row.rows[0]?.companions).toBe(0);
	} finally {
		await destroyFixture(pool, event);
	}
});

test("editGuest rejects a guest that belongs to a different event", async () => {
	const eventA = await createOrganizerSession(pool, { role: "editor" });
	const eventB = await createOrganizerSession(pool, { role: "editor" });
	const guestId = await guest(eventA);
	try {
		expect(
			(await editGuest(eventB, guestId, { displayName: "Cross-event edit" }))
				.status,
		).toBe(404);
		const row = await pool.query(
			"select display_name from guests where id=$1",
			[guestId],
		);
		expect(row.rows[0]?.display_name).toBe("Original Guest");
	} finally {
		await destroyFixture(pool, eventA);
		await destroyFixture(pool, eventB);
	}
});

test("deleteEventFn handler archives an event for the owner", async () => {
	const event = await createOrganizerSession(pool);
	try {
		expect((await archive(event)).status).toBe(204);
		const row = await pool.query("select status from events where id=$1", [
			event.eventId,
		]);
		expect(row.rows[0]?.status).toBe("archived");
	} finally {
		await destroyFixture(pool, event);
	}
});

test("editGiftInput accepts partial updates and a gift id", async () => {
	const event = await createOrganizerSession(pool, { role: "editor" });
	const giftId = await gift(event);
	try {
		expect((await editGift(event, giftId, { title: "Updated" })).status).toBe(
			200,
		);
		expect((await editGift(event, giftId, { title: "  " })).status).toBe(400);
	} finally {
		await destroyFixture(pool, event);
	}
});

test("editGuestInput accepts partial updates and a guest id", async () => {
	const event = await createOrganizerSession(pool, { role: "editor" });
	const guestId = await guest(event);
	try {
		expect(
			(await editGuest(event, guestId, { displayName: "Updated" })).status,
		).toBe(200);
		expect((await editGuest(event, guestId, { companions: -1 })).status).toBe(
			400,
		);
	} finally {
		await destroyFixture(pool, event);
	}
});

test("createGift structurally anchors event scope to the actor, not input", async () => {
	const event = await createOrganizerSession(pool, { role: "editor" });
	const other = await createOrganizerSession(pool, { role: "editor" });
	try {
		const response = await callParameterizedJsonRoute(createGift, {
			path: "/api/gifts",
			method: "POST",
			headers: { cookie: event.cookie },
			body: {
				title: "Anchored gift",
				description: null,
				url: null,
				imagePublicId: null,
				position: 0,
			},
			params: { eventId: event.eventId },
		});
		expect(response.status).toBe(200);
		const created = (await response.json()) as { id: string };
		const row = await pool.query("select event_id from gifts where id=$1", [
			created.id,
		]);
		expect(row.rows[0]?.event_id).toBe(event.eventId);
		expect(row.rows[0]?.event_id).not.toBe(other.eventId);
	} finally {
		await destroyFixture(pool, event);
		await destroyFixture(pool, other);
	}
});

test("editGift ignores a conflicting eventId supplied in untrusted input", async () => {
	const event = await createOrganizerSession(pool, { role: "editor" });
	const other = await createOrganizerSession(pool, { role: "editor" });
	const giftId = await gift(event);
	try {
		expect(
			(
				await editGift(event, giftId, {
					title: "Still anchored",
					eventId: other.eventId,
				})
			).status,
		).toBe(400);
		const row = await pool.query(
			"select event_id, title from gifts where id=$1",
			[giftId],
		);
		expect(row.rows[0]).toEqual({
			event_id: event.eventId,
			title: "Original title",
		});
	} finally {
		await destroyFixture(pool, event);
		await destroyFixture(pool, other);
	}
});

test("a guest actor is rejected from editGift and editGuest before any write", async () => {
	const event = await createOrganizerSession(pool);
	const giftId = await gift(event);
	const guestId = await guest(event);
	const guestSession = await createGuestSession(pool, event);
	try {
		const visitor = { ...event, cookie: guestSession.cookie };
		expect((await editGift(visitor, giftId, { title: "Hacked" })).status).toBe(
			403,
		);
		expect(
			(await editGuest(visitor, guestId, { displayName: "Hacked" })).status,
		).toBe(403);
		const [gifts, guests] = await Promise.all([
			pool.query("select title from gifts where id=$1", [giftId]),
			pool.query("select display_name from guests where id=$1", [guestId]),
		]);
		expect(gifts.rows[0]?.title).toBe("Original title");
		expect(guests.rows[0]?.display_name).toBe("Original Guest");
	} finally {
		await destroyFixture(pool, event);
	}
});

test("editGuestInput accepts explicit null attendance", async () => {
	const event = await createOrganizerSession(pool, { role: "editor" });
	const guestId = await guest(event);
	try {
		expect((await editGuest(event, guestId, { attending: null })).status).toBe(
			200,
		);
	} finally {
		await destroyFixture(pool, event);
	}
});

test("editGuest stores explicit null attendance and clears respondedAt", async () => {
	const event = await createOrganizerSession(pool, { role: "editor" });
	const guestId = await guest(event);
	await pool.query(
		"update guests set attending=true, companions=2, responded_at=$1 where id=$2",
		[new Date("2030-01-01T00:00:00.000Z"), guestId],
	);
	try {
		expect((await editGuest(event, guestId, { attending: null })).status).toBe(
			200,
		);
		const row = await pool.query(
			"select attending, companions, responded_at from guests where id=$1 and event_id=$2",
			[guestId, event.eventId],
		);
		expect(row.rows[0]).toEqual({
			attending: null,
			companions: 2,
			responded_at: null,
		});
	} finally {
		await destroyFixture(pool, event);
	}
});

test("editGuest leaves attendance unchanged when the field is absent", async () => {
	const event = await createOrganizerSession(pool, { role: "editor" });
	const guestId = await guest(event);
	await pool.query(
		"update guests set attending=true, companions=2, responded_at=$1 where id=$2",
		[new Date("2030-01-01T00:00:00.000Z"), guestId],
	);
	try {
		expect((await editGuest(event, guestId, { companions: 1 })).status).toBe(
			200,
		);
		const row = await pool.query(
			"select attending, companions from guests where id=$1 and event_id=$2",
			[guestId, event.eventId],
		);
		expect(row.rows[0]).toEqual({ attending: true, companions: 1 });
	} finally {
		await destroyFixture(pool, event);
	}
});

test("admin route callback wiring: deleteEvent handler body archives the event", async () => {
	const event = await createOrganizerSession(pool);
	try {
		expect((await archive(event)).status).toBe(204);
		const audit = await pool.query(
			"select action from audit_log where event_id=$1",
			[event.eventId],
		);
		expect(audit.rows.map((row) => row.action)).toContain("event.archived");
	} finally {
		await destroyFixture(pool, event);
	}
});

test("admin route callback wiring: editGift handler body edits the gift", async () => {
	const event = await createOrganizerSession(pool, { role: "editor" });
	const giftId = await gift(event);
	try {
		expect(
			(await editGift(event, giftId, { title: "Routed gift" })).status,
		).toBe(200);
		const row = await pool.query("select title from gifts where id=$1", [
			giftId,
		]);
		expect(row.rows[0]?.title).toBe("Routed gift");
	} finally {
		await destroyFixture(pool, event);
	}
});

test("admin route callback wiring: editGuest handler body edits the guest", async () => {
	const event = await createOrganizerSession(pool, { role: "editor" });
	const guestId = await guest(event);
	try {
		expect(
			(await editGuest(event, guestId, { displayName: "Routed guest" })).status,
		).toBe(200);
		const row = await pool.query(
			"select display_name from guests where id=$1",
			[guestId],
		);
		expect(row.rows[0]?.display_name).toBe("Routed guest");
	} finally {
		await destroyFixture(pool, event);
	}
});

test("admin route module is importable and exposes the wired component", () => {
	// Next Route Handlers replace the old route component contract; exporting handlers is the equivalent public surface.
	expect(typeof DELETE).toBe("function");
	expect(typeof patchEvent).toBe("function");
	expect(typeof patchGift).toBe("function");
	expect(typeof patchGuest).toBe("function");
});
