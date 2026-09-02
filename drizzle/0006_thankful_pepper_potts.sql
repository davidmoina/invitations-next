-- better-auth 1.7 scopes account identity by issuer, so `account.issuer` is
-- required. A bare `ADD COLUMN ... NOT NULL` would fail on any table that
-- already holds rows, which is precisely the case the upstream upgrade guide
-- warns about, so this backfills before tightening the constraint.
--
-- Every account this application can have written so far is an
-- email-and-password one: `emailAndPassword` is the only enabled method in
-- `src/platform/auth/better-auth.ts`, and better-auth writes those with
-- `createLocalAccountIssuer("credential")` — the literal `local:credential`.
ALTER TABLE "account" ADD COLUMN "issuer" text;--> statement-breakpoint
UPDATE "account" SET "issuer" = 'local:' || "provider_id" WHERE "issuer" IS NULL;--> statement-breakpoint
ALTER TABLE "account" ALTER COLUMN "issuer" SET NOT NULL;
