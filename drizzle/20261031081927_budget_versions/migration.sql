CREATE TABLE "budget_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"budget_id" uuid NOT NULL,
	"name" text NOT NULL,
	"spending_type" text NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"amount" bigint NOT NULL,
	"category_ids" uuid[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "budget_versions_spending_type_check" CHECK ("spending_type" in ('needs', 'wants')),
	CONSTRAINT "budget_versions_month_check" CHECK ("month" between 1 and 12),
	CONSTRAINT "budget_versions_amount_check" CHECK ("amount" >= 0),
	CONSTRAINT "budget_versions_category_ids_check" CHECK (cardinality("category_ids") >= 1)
);
--> statement-breakpoint
ALTER TABLE "budget_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "budget_versions_user_budget_period_unique" ON "budget_versions" ("user_id","budget_id","year","month");--> statement-breakpoint
ALTER TABLE "budget_versions" ADD CONSTRAINT "budget_versions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;