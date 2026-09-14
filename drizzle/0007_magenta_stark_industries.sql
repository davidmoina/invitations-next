ALTER TABLE "events" ADD COLUMN "honoree_names" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "baby_sex" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "turning_age" integer;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_event_type" CHECK ("events"."event_type" in ('wedding', 'baby_shower', 'birthday', 'other'));--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_detail_scope" CHECK (("events"."due_date" is null or "events"."event_type" = 'baby_shower') and ("events"."baby_sex" is null or "events"."event_type" = 'baby_shower') and ("events"."turning_age" is null or "events"."event_type" = 'birthday'));--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_detail_presence" CHECK ("events"."event_type" <> 'baby_shower' or "events"."due_date" is not null);--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_baby_sex" CHECK ("events"."baby_sex" is null or "events"."baby_sex" in ('boy', 'girl'));