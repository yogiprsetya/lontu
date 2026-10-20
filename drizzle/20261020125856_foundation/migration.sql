CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"subtype" text,
	"initial_balance" bigint DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_type_check" CHECK ("type" in ('transaction', 'asset'))
);
--> statement-breakpoint
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"category_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"amount" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budgets_month_check" CHECK ("month" between 1 and 12),
	CONSTRAINT "budgets_amount_check" CHECK ("amount" >= 0)
);
--> statement-breakpoint
ALTER TABLE "budgets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"spending_type" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_kind_check" CHECK ("kind" in ('income', 'saving', 'spending')),
	CONSTRAINT "categories_spending_type_check" CHECK (("spending_type" is null or "spending_type" in ('needs', 'wants')) and ("kind" = 'spending') = ("spending_type" is not null))
);
--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"amount" bigint NOT NULL,
	"date" date NOT NULL,
	"account_id" uuid NOT NULL,
	"to_account_id" uuid,
	"category_id" uuid,
	"description" text,
	"receipt_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "transactions_type_check" CHECK ("type" in ('income', 'expense', 'saving', 'transfer')),
	CONSTRAINT "transactions_amount_check" CHECK ("amount" > 0),
	CONSTRAINT "transactions_transfer_target_check" CHECK (("type" = 'transfer') = ("to_account_id" is not null)),
	CONSTRAINT "transactions_category_check" CHECK (("type" = 'transfer') = ("category_id" is null)),
	CONSTRAINT "transactions_distinct_accounts_check" CHECK ("to_account_id" <> "account_id")
);
--> statement-breakpoint
ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY,
	"email" text NOT NULL UNIQUE,
	"display_name" text,
	"image" text,
	"phone" text,
	"location" text,
	"currency" text DEFAULT 'IDR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_user_name_unique" ON "accounts" ("user_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_user_category_period_unique" ON "budgets" ("user_id","category_id","year","month");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_user_kind_name_unique" ON "categories" ("user_id","kind",lower("name"));--> statement-breakpoint
CREATE INDEX "transactions_user_date_idx" ON "transactions" ("user_id","date" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "transactions_user_account_idx" ON "transactions" ("user_id","account_id");--> statement-breakpoint
CREATE INDEX "transactions_user_to_account_idx" ON "transactions" ("user_id","to_account_id");--> statement-breakpoint
CREATE INDEX "transactions_user_category_date_idx" ON "transactions" ("user_id","category_id","date");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id");--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_to_account_id_accounts_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id");--> statement-breakpoint
CREATE VIEW "account_balances" WITH (security_invoker = true) AS (
    select a.id as account_id, a.user_id,
      a.initial_balance + coalesce(sum(case
        when t.type = 'income'                              then t.amount
        when t.type in ('expense', 'saving')                then -t.amount
        when t.type = 'transfer' and t.account_id = a.id    then -t.amount
        when t.type = 'transfer' and t.to_account_id = a.id then t.amount
      end), 0)::bigint as balance
    from accounts a
    left join transactions t
      on t.deleted_at is null and (t.account_id = a.id or t.to_account_id = a.id)
    group by a.id
  );