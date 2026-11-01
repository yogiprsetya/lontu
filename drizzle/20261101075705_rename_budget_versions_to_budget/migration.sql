ALTER TABLE "budget_versions" RENAME TO "budget";--> statement-breakpoint
ALTER TABLE "budget" RENAME CONSTRAINT "budget_versions_spending_type_check" TO "budget_spending_type_check";--> statement-breakpoint
ALTER TABLE "budget" RENAME CONSTRAINT "budget_versions_month_check" TO "budget_month_check";--> statement-breakpoint
ALTER TABLE "budget" RENAME CONSTRAINT "budget_versions_amount_check" TO "budget_amount_check";--> statement-breakpoint
ALTER TABLE "budget" RENAME CONSTRAINT "budget_versions_category_ids_check" TO "budget_category_ids_check";--> statement-breakpoint
ALTER INDEX "budget_versions_user_budget_period_unique" RENAME TO "budget_user_budget_period_unique";