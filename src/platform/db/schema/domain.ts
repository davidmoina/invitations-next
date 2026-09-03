import { sql } from "drizzle-orm";
import {
	bigserial,
	boolean,
	check,
	date,
	foreignKey,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	unique,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

const createdAt = timestamp("created_at", { withTimezone: true })
	.defaultNow()
	.notNull();

export const organizerProfile = pgTable(
	"organizer_profile",
	{
		userId: text("user_id")
			.primaryKey()
			.references(() => user.id, { onDelete: "cascade" }),
		plan: text("plan").notNull().default("free"),
		createdAt,
	},
	(table) => [
		check("organizer_profile_plan", sql`${table.plan} in ('free', 'comped')`),
	],
);

export const events = pgTable(
	"events",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		slug: text("slug").notNull().unique(),
		title: text("title").notNull(),
		eventType: text("event_type").notNull(),
		honoreeNames: text("honoree_names").array().notNull().default([]),
		dueDate: date("due_date", { mode: "string" }),
		babySex: text("baby_sex"),
		turningAge: integer("turning_age"),
		startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
		timezone: text("timezone").notNull(),
		venueName: text("venue_name"),
		venueAddress: text("venue_address"),
		venueMapUrl: text("venue_map_url"),
		description: text("description"),
		maxCompanions: integer("max_companions").notNull().default(0),
		giftRegistryEnabled: boolean("gift_registry_enabled")
			.notNull()
			.default(true),
		rsvpDeadline: timestamp("rsvp_deadline", { withTimezone: true }),
		status: text("status").notNull().default("draft"),
		createdBy: text("created_by")
			.notNull()
			.references(() => user.id),
		createdAt,
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		check("events_cap", sql`${table.maxCompanions} >= 0`),
		check(
			"events_status",
			sql`${table.status} in ('draft', 'published', 'archived')`,
		),
		check(
			"events_event_type",
			sql`${table.eventType} in ('wedding', 'baby_shower', 'birthday', 'other')`,
		),
		check(
			"events_detail_scope",
			sql`(${table.dueDate} is null or ${table.eventType} = 'baby_shower') and (${table.babySex} is null or ${table.eventType} = 'baby_shower') and (${table.turningAge} is null or ${table.eventType} = 'birthday')`,
		),
		check(
			"events_detail_presence",
			sql`${table.eventType} <> 'baby_shower' or ${table.dueDate} is not null`,
		),
		check(
			"events_baby_sex",
			sql`${table.babySex} is null or ${table.babySex} in ('boy', 'girl')`,
		),
	],
);

export const eventMemberships = pgTable(
	"event_memberships",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		eventId: uuid("event_id")
			.notNull()
			.references(() => events.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		role: text("role").notNull(),
		createdAt,
	},
	(table) => [
		unique().on(table.eventId, table.userId),
		check("event_memberships_role", sql`${table.role} in ('owner', 'editor')`),
		uniqueIndex("one_owner_per_event")
			.on(table.eventId)
			.where(sql`${table.role} = 'owner'`),
		index("event_memberships_user_id_idx").on(table.userId),
	],
);

export const guests = pgTable(
	"guests",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		eventId: uuid("event_id")
			.notNull()
			.references(() => events.id, { onDelete: "cascade" }),
		displayName: text("display_name").notNull(),
		nameNormalized: text("name_normalized").notNull(),
		email: text("email"),
		emailNormalized: text("email_normalized"),
		source: text("source").notNull(),
		attending: boolean("attending"),
		companions: integer("companions").notNull().default(0),
		respondedAt: timestamp("responded_at", { withTimezone: true }),
		createdAt,
	},
	(table) => [
		unique().on(table.eventId, table.emailNormalized, table.nameNormalized),
		unique().on(table.id, table.eventId),
		check("guests_companions", sql`${table.companions} >= 0`),
		check(
			"guests_source",
			sql`${table.source} in ('public_link', 'preloaded')`,
		),
		index("guests_event_id_idx").on(table.eventId),
		index("guests_event_email_idx").on(table.eventId, table.emailNormalized),
	],
);

export const guestTokens = pgTable(
	"guest_tokens",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		guestId: uuid("guest_id").notNull(),
		eventId: uuid("event_id").notNull(),
		tokenHash: text("token_hash").notNull().unique(),
		createdAt,
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
	},
	(table) => [
		foreignKey({
			name: "guest_tokens_guest_event_fk",
			columns: [table.guestId, table.eventId],
			foreignColumns: [guests.id, guests.eventId],
		}).onDelete("cascade"),
	],
);

export const gifts = pgTable(
	"gifts",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		eventId: uuid("event_id")
			.notNull()
			.references(() => events.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		description: text("description"),
		url: text("url"),
		imagePublicId: text("image_public_id"),
		position: integer("position").notNull().default(0),
		createdAt,
	},
	(table) => [
		unique().on(table.id, table.eventId),
		index("gifts_event_position_idx").on(table.eventId, table.position),
	],
);

export const giftReservations = pgTable(
	"gift_reservations",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		giftId: uuid("gift_id").notNull(),
		guestId: uuid("guest_id").notNull(),
		eventId: uuid("event_id").notNull(),
		reservedAt: timestamp("reserved_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
		cancelledByKind: text("cancelled_by_kind"),
	},
	(table) => [
		foreignKey({
			name: "gift_reservations_gift_event_fk",
			columns: [table.giftId, table.eventId],
			foreignColumns: [gifts.id, gifts.eventId],
		}).onDelete("cascade"),
		foreignKey({
			name: "gift_reservations_guest_event_fk",
			columns: [table.guestId, table.eventId],
			foreignColumns: [guests.id, guests.eventId],
		}).onDelete("cascade"),
		uniqueIndex("gift_reservations_one_active")
			.on(table.giftId)
			.where(sql`${table.cancelledAt} is null`),
	],
);

export const guestMessages = pgTable(
	"guest_messages",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		eventId: uuid("event_id").notNull(),
		guestId: uuid("guest_id").notNull(),
		body: text("body").notNull(),
		createdAt,
	},
	(table) => [
		foreignKey({
			name: "guest_messages_guest_event_fk",
			columns: [table.guestId, table.eventId],
			foreignColumns: [guests.id, guests.eventId],
		}).onDelete("cascade"),
	],
);

export const eventMedia = pgTable(
	"event_media",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		eventId: uuid("event_id")
			.notNull()
			.references(() => events.id),
		imagePublicId: text("image_public_id").notNull(),
		width: integer("width").notNull(),
		height: integer("height").notNull(),
		alt: text("alt").notNull(),
		position: integer("position").notNull().default(0),
		createdAt,
	},
	(table) => [unique().on(table.eventId, table.imagePublicId)],
);

export const auditLog = pgTable(
	"audit_log",
	{
		id: bigserial("id", { mode: "number" }).primaryKey(),
		eventId: uuid("event_id").references(() => events.id),
		actorKind: text("actor_kind").notNull(),
		actorUserId: text("actor_user_id").references(() => user.id),
		actorGuestId: uuid("actor_guest_id").references(() => guests.id, {
			onDelete: "set null",
		}),
		actorLabel: text("actor_label").notNull(),
		action: text("action").notNull(),
		entityType: text("entity_type").notNull(),
		entityId: text("entity_id").notNull(),
		summary: jsonb("summary").notNull().default({}),
		occurredAt: timestamp("occurred_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		check(
			"audit_actor",
			sql`(${table.actorKind} = 'organizer' and ${table.actorUserId} is not null) or (${table.actorKind} = 'guest' and ${table.actorGuestId} is not null) or ${table.actorKind} = 'system'`,
		),
		index("audit_log_event_occurred_at_idx").on(
			table.eventId,
			table.occurredAt.desc(),
		),
	],
);
