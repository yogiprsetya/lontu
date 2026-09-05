ALTER TABLE "expenses" ADD COLUMN "recurring_config_id" integer;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "recurring_period" varchar(7);--> statement-breakpoint
CREATE UNIQUE INDEX "expenses_recurring_period_unique" ON "expenses" USING btree ("recurring_config_id","recurring_period");