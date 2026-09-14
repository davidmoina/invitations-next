ALTER TABLE "guests" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "guests" ADD COLUMN "phone_normalized" text;--> statement-breakpoint
CREATE INDEX "guests_event_phone_idx" ON "guests" USING btree ("event_id","phone_normalized");