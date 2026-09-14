import { expect, test, vi } from "vitest";

import { selectRuntimeDatabaseUrl } from "./database-target";

const transaction = vi.fn();

vi.mock("@neondatabase/serverless", () => ({
	Pool: class Pool {},
	neonConfig: {},
}));

vi.mock("drizzle-orm/neon-serverless", () => ({
	drizzle: () => ({ transaction }),
}));

vi.mock("#/platform/env", () => ({
	serverEnv: () => ({
		DATABASE_URL: "postgres://production",
		DATABASE_URL_TEST: "postgres://test",
	}),
}));

const client = await import("./client");

test("the sealed client rejects an unresolved actor before opening a transaction", async () => {
	await expect(
		client.withActor(null as never, async () => ({
			value: "unreachable",
			events: [
				{
					action: "unreachable",
					entityType: "test",
					entityId: "test",
					eventId: null,
				},
			],
		})),
	).rejects.toThrow("resolvable actor");

	expect(transaction).not.toHaveBeenCalled();
});

test("the client exposes no raw database or transaction handle", () => {
	expect(Object.keys(client).sort()).toEqual([
		"appendAuditEvents",
		"readOnly",
		"withActor",
	]);
});

test("the sealed client commits the mutation result and its audit event together", async () => {
	const values = vi.fn().mockResolvedValue(undefined);
	const insert = vi.fn(() => ({ values }));
	transaction.mockImplementationOnce(async (run) => run({ insert }));

	const actor = {
		kind: "organizer",
		userId: "user-1",
		eventId: "00000000-0000-0000-0000-000000000001",
		role: "owner",
	} as never;
	const result = await client.withActor(actor, async () => ({
		value: "committed",
		events: [
			{
				action: "event.created",
				entityType: "event",
				entityId: "event-1",
				eventId: "00000000-0000-0000-0000-000000000001" as never,
			},
		],
	}));

	expect(result).toBe("committed");
	expect(transaction).toHaveBeenCalledOnce();
	expect(insert).toHaveBeenCalledOnce();
	expect(values).toHaveBeenCalledWith([
		expect.objectContaining({ action: "event.created", actorUserId: "user-1" }),
	]);
});

test("non-production execution selects the test database", () => {
	const environment = {
		DATABASE_URL: "postgres://production",
		DATABASE_URL_TEST: "postgres://test",
	};

	expect(
		selectRuntimeDatabaseUrl({ ...environment, NODE_ENV: "development" }),
	).toBe(environment.DATABASE_URL_TEST);
	expect(selectRuntimeDatabaseUrl({ ...environment, NODE_ENV: "test" })).toBe(
		environment.DATABASE_URL_TEST,
	);
});

test("the connection pool is never built at import time", async () => {
	const source = await import("node:fs/promises").then((fs) =>
		fs.readFile(new URL("./connection.ts", import.meta.url), "utf8"),
	);

	// `serverEnv()` must only ever be called from inside a function body.
	expect(source).not.toMatch(/^const\s+\w+\s*=\s*serverEnv\(\)/m);
});
