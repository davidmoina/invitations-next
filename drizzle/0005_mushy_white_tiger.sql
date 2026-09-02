DROP INDEX "one_owner_per_event";--> statement-breakpoint
DROP INDEX "gift_reservations_one_active";--> statement-breakpoint
CREATE UNIQUE INDEX "one_owner_per_event" ON "event_memberships" USING btree ("event_id") WHERE "event_memberships"."role" = 'owner';--> statement-breakpoint
CREATE UNIQUE INDEX "gift_reservations_one_active" ON "gift_reservations" USING btree ("gift_id") WHERE "gift_reservations"."cancelled_at" is null;