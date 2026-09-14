ALTER TABLE "events" DROP CONSTRAINT "events_status";--> statement-breakpoint
ALTER TABLE "organizer_profile" DROP CONSTRAINT "organizer_profile_plan";--> statement-breakpoint
ALTER TABLE "gift_reservations" DROP CONSTRAINT "gift_reservations_gift_id_gifts_id_fk";
--> statement-breakpoint
ALTER TABLE "gift_reservations" DROP CONSTRAINT "gift_reservations_guest_id_guests_id_fk";
--> statement-breakpoint
ALTER TABLE "gift_reservations" DROP CONSTRAINT "gift_reservations_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "guest_messages" DROP CONSTRAINT "guest_messages_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "guest_messages" DROP CONSTRAINT "guest_messages_guest_id_guests_id_fk";
--> statement-breakpoint
ALTER TABLE "guest_tokens" DROP CONSTRAINT "guest_tokens_guest_id_guests_id_fk";
--> statement-breakpoint
ALTER TABLE "guest_tokens" DROP CONSTRAINT "guest_tokens_event_id_events_id_fk";
--> statement-breakpoint
ALTER TABLE "gift_reservations" ADD CONSTRAINT "gift_reservations_gift_event_fk" FOREIGN KEY ("gift_id","event_id") REFERENCES "public"."gifts"("id","event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_reservations" ADD CONSTRAINT "gift_reservations_guest_event_fk" FOREIGN KEY ("guest_id","event_id") REFERENCES "public"."guests"("id","event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_messages" ADD CONSTRAINT "guest_messages_guest_event_fk" FOREIGN KEY ("guest_id","event_id") REFERENCES "public"."guests"("id","event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guest_tokens" ADD CONSTRAINT "guest_tokens_guest_event_fk" FOREIGN KEY ("guest_id","event_id") REFERENCES "public"."guests"("id","event_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_event_occurred_at_idx" ON "audit_log" USING btree ("event_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "event_memberships_user_id_idx" ON "event_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "gifts_event_position_idx" ON "gifts" USING btree ("event_id","position");--> statement-breakpoint
CREATE INDEX "guests_event_id_idx" ON "guests" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "guests_event_email_idx" ON "guests" USING btree ("event_id","email_normalized");--> statement-breakpoint
ALTER TABLE "event_memberships" ADD CONSTRAINT "event_memberships_role" CHECK ("event_memberships"."role" in ('owner', 'editor'));--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_status" CHECK ("events"."status" in ('draft', 'published', 'archived'));--> statement-breakpoint
ALTER TABLE "guests" ADD CONSTRAINT "guests_source" CHECK ("guests"."source" in ('public_link', 'preloaded'));--> statement-breakpoint
ALTER TABLE "organizer_profile" ADD CONSTRAINT "organizer_profile_plan" CHECK ("organizer_profile"."plan" in ('free', 'comped'));