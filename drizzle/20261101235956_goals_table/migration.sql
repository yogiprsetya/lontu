CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"target_amount" bigint NOT NULL,
	"target_year" integer,
	"target_month" integer,
	"account_ids" uuid[] NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_amount_check" CHECK ("target_amount" between 1 and 1000000000000),
	CONSTRAINT "goals_target_check" CHECK (("target_year" is null) = ("target_month" is null) and ("target_month" is null or "target_month" between 1 and 12)),
	CONSTRAINT "goals_account_ids_check" CHECK (cardinality("account_ids") between 1 and 20)
);
--> statement-breakpoint
ALTER TABLE "goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "goals_user_idx" ON "goals" ("user_id");--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;