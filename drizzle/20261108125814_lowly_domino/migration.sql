ALTER TABLE "lontu"."recurring_rules" ADD COLUMN "to_account_id" uuid;--> statement-breakpoint
ALTER TABLE "lontu"."recurring_rules" ALTER COLUMN "category_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "lontu"."recurring_rules" ADD CONSTRAINT "recurring_rules_to_account_id_accounts_id_fkey" FOREIGN KEY ("to_account_id") REFERENCES "lontu"."accounts"("id");--> statement-breakpoint
ALTER TABLE "lontu"."recurring_rules" ADD CONSTRAINT "recurring_rules_transfer_check" CHECK (("type" = 'transfer') = ("to_account_id" is not null));--> statement-breakpoint
ALTER TABLE "lontu"."recurring_rules" ADD CONSTRAINT "recurring_rules_category_check" CHECK (("type" = 'transfer') = ("category_id" is null));--> statement-breakpoint
ALTER TABLE "lontu"."recurring_rules" ADD CONSTRAINT "recurring_rules_distinct_accounts_check" CHECK ("to_account_id" <> "account_id");--> statement-breakpoint
ALTER TABLE "lontu"."recurring_rules" DROP CONSTRAINT "recurring_rules_type_check", ADD CONSTRAINT "recurring_rules_type_check" CHECK ("type" in ('income', 'expense', 'saving', 'transfer'));