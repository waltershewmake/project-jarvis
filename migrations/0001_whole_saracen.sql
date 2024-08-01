ALTER TABLE "user" ADD COLUMN "first_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "last_name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "salutation" text NOT NULL;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN IF EXISTS "name";