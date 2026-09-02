import { randomUUID } from "node:crypto";

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

import type { Actor, AuditedTx } from "#/audit/actor";
import { appendAuditEvents, withActor } from "#/platform/db/client";
import * as schema from "#/platform/db/schema";
import { events } from "#/platform/db/schema/domain";

const testDatabaseUrl = process.env.DATABASE_URL_TEST;
if (!testDatabaseUrl) {
	throw new Error("DATABASE_URL_TEST is required for integration tests.");
}

const fixturePool = new Pool({ connectionString: testDatabaseUrl });
const fixtureIds = { userId: `itest-${randomUUID()}`, eventId: randomUUID() };
const actor: Actor = {
	kind: "organizer",
	userId: fixtureIds.userId as never,
	eventId: fixtureIds.eventId as never,
	role: "owner",
};

beforeAll(async () => {
	await fixturePool.query(
		'insert into "user" (id, name, email, email_verified, updated_at) values ($1, $2, $3, true, now())',
		[
			fixtureIds.userId,
			"Integration organizer",
			`${fixtureIds.userId}@example.test`,
		],
	);
	await fixturePool.query(
		"insert into events (id, slug, title, event_type, starts_at, timezone, created_by) values ($1, $2, $3, $4, $5, $6, $7)",
		[
			fixtureIds.eventId,
			`audit-role-${randomUUID()}`,
			"Audit role fixture",
			"other",
			"2030-01-01T00:00:00.000Z",
			"UTC",
			fixtureIds.userId,
		],
	);
});

afterAll(async () => {
	await fixturePool.query("delete from audit_log where event_id = $1", [
		fixtureIds.eventId,
	]);
	await fixturePool.query("delete from events where id = $1", [
		fixtureIds.eventId,
	]);
	await fixturePool.query('delete from "user" where id = $1', [
		fixtureIds.userId,
	]);
	await fixturePool.end();
});

describe("sealed audited mutations", () => {
	test("rejects an unresolvable actor before opening a callback or writing an audit row", async () => {
		const before = await fixturePool.query(
			"select count(*)::int as count from audit_log",
		);
		const callback = async () => {
			throw new Error("callback must not run");
		};

		await expect(withActor(null as never, callback as never)).rejects.toThrow(
			"resolvable actor",
		);

		const after = await fixturePool.query(
			"select count(*)::int as count from audit_log",
		);
		expect(after.rows[0]?.count).toBe(before.rows[0]?.count);
	});

	test("rolls back application data and explicitly appended audit rows after a forced throw", async () => {
		const rollbackEventId = randomUUID();
		const slug = `rollback-${randomUUID()}`;

		await expect(
			withActor(actor, async (tx) => {
				await tx.insert(events).values({
					id: rollbackEventId,
					slug,
					title: "Rollback fixture",
					eventType: "other",
					startsAt: new Date("2030-01-01T00:00:00.000Z"),
					timezone: "UTC",
					createdBy: fixtureIds.userId,
				});
				await appendAuditEvents(tx, actor, [
					{
						action: "event.created",
						entityType: "event",
						entityId: rollbackEventId,
						eventId: rollbackEventId as never,
					},
				]);
				throw new Error("force rollback");
			}),
		).rejects.toThrow("force rollback");

		const [eventRows, auditRows] = await Promise.all([
			fixturePool.query("select id from events where id = $1", [
				rollbackEventId,
			]),
			fixturePool.query("select id from audit_log where entity_id = $1", [
				rollbackEventId,
			]),
		]);
		expect(eventRows.rows).toEqual([]);
		expect(auditRows.rows).toEqual([]);
	});
});

test("the audit application role can append but cannot update or delete a seeded audit row", async () => {
	const client = await fixturePool.connect();
	const roleDb = drizzle({ client, schema });
	const entityId = randomUUID();

	try {
		await client.query("set role invitations_audit_app");
		await roleDb.transaction(async (tx) => {
			await appendAuditEvents(tx as unknown as AuditedTx, actor, [
				{
					action: "audit.appended",
					entityType: "audit_fixture",
					entityId,
					eventId: null,
				},
			]);
		});

		const seeded = await client.query(
			"select id from audit_log where entity_id = $1",
			[entityId],
		);
		expect(seeded.rows).toHaveLength(1);
		const auditId = seeded.rows[0]?.id;

		await expect(
			client.query("update audit_log set action = 'mutated' where id = $1", [
				auditId,
			]),
		).rejects.toMatchObject({ code: "42501" });
		await expect(
			client.query("delete from audit_log where id = $1", [auditId]),
		).rejects.toMatchObject({ code: "42501" });
	} finally {
		await client.query("reset role");
		await client.query("delete from audit_log where entity_id = $1", [
			entityId,
		]);
		client.release();
	}
});
