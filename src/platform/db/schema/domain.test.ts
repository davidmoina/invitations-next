import { getTableConfig } from "drizzle-orm/pg-core";
import { expect, test } from "vitest";

import {
	auditLog,
	eventMemberships,
	giftReservations,
	gifts,
	guestMessages,
	guests,
} from "./domain";

function foreignKeyShapes(table: Parameters<typeof getTableConfig>[0]) {
	return getTableConfig(table).foreignKeys.map((key) => {
		const reference = key.reference();
		return {
			columns: reference.columns.map((column) => column.name),
			foreignColumns: reference.foreignColumns.map((column) => column.name),
			foreignTable: (
				reference.foreignTable as unknown as { [key: symbol]: string }
			)[Symbol.for("drizzle:Name")],
		};
	});
}

function names<T extends { name: string }>(items: readonly T[]) {
	return items.map((item) => item.name).sort();
}

test("tenant-bound tables use composite foreign keys for their guest and gift references", () => {
	expect(foreignKeyShapes(giftReservations)).toEqual(
		expect.arrayContaining([
			{
				columns: ["gift_id", "event_id"],
				foreignColumns: ["id", "event_id"],
				foreignTable: "gifts",
			},
			{
				columns: ["guest_id", "event_id"],
				foreignColumns: ["id", "event_id"],
				foreignTable: "guests",
			},
		]),
	);
	expect(foreignKeyShapes(guestMessages)).toContainEqual({
		columns: ["guest_id", "event_id"],
		foreignColumns: ["id", "event_id"],
		foreignTable: "guests",
	});
});

test("the documented role/source checks and supporting indexes are structural schema invariants", () => {
	expect(names(getTableConfig(eventMemberships).checks)).toContain(
		"event_memberships_role",
	);
	expect(names(getTableConfig(guests).checks)).toContain("guests_source");
	expect(names(getTableConfig(auditLog).checks)).toContain("audit_actor");

	expect(
		getTableConfig(guests)
			.indexes.map((item) => item.config.name)
			.sort(),
	).toEqual(
		expect.arrayContaining(["guests_event_email_idx", "guests_event_id_idx"]),
	);
	expect(
		getTableConfig(gifts).indexes.map((item) => item.config.name),
	).toContain("gifts_event_position_idx");
	expect(
		getTableConfig(eventMemberships).indexes.map((item) => item.config.name),
	).toContain("event_memberships_user_id_idx");
	expect(
		getTableConfig(auditLog).indexes.map((item) => item.config.name),
	).toContain("audit_log_event_occurred_at_idx");
});

test("owner and active-reservation guards are unique partial indexes", () => {
	const ownershipIndex = getTableConfig(eventMemberships).indexes.find(
		(index) => index.config.name === "one_owner_per_event",
	);
	const reservationIndex = getTableConfig(giftReservations).indexes.find(
		(index) => index.config.name === "gift_reservations_one_active",
	);

	expect(ownershipIndex?.config.unique).toBe(true);
	expect(ownershipIndex?.config.where?.queryChunks).toBeDefined();
	expect(reservationIndex?.config.unique).toBe(true);
	expect(reservationIndex?.config.where?.queryChunks).toBeDefined();
});
