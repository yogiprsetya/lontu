CREATE TABLE "recurring_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"amount" bigint NOT NULL,
	"account_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"day_of_month" smallint NOT NULL,
	"next_due_date" date NOT NULL,
	"is_payday" boolean DEFAULT false NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_rules_type_check" CHECK ("type" in ('income', 'expense', 'saving')),
	CONSTRAINT "recurring_rules_amount_check" CHECK ("amount" > 0),
	CONSTRAINT "recurring_rules_day_check" CHECK ("day_of_month" between 1 and 31),
	CONSTRAINT "recurring_rules_payday_check" CHECK (not "is_payday" or "type" = 'income')
);
--> statement-breakpoint
ALTER TABLE "recurring_rules" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "recurring_rules_one_payday" ON "recurring_rules" ("user_id") WHERE "is_payday" and "archived_at" is null;--> statement-breakpoint
CREATE INDEX "recurring_rules_user_idx" ON "recurring_rules" ("user_id","next_due_date");--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "recurring_rules" ADD CONSTRAINT "recurring_rules_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id");