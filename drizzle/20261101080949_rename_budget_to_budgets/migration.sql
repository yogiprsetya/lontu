ALTER TABLE "budget" RENAME TO "budgets";--> statement-breakpoint
ALTER TABLE "budgets" RENAME CONSTRAINT "budget_spending_type_check" TO "budgets_spending_type_check";--> statement-breakpoint
ALTER TABLE "budgets" RENAME CONSTRAINT "budget_month_check" TO "budgets_month_check";--> statement-breakpoint
ALTER TABLE "budgets" RENAME CONSTRAINT "budget_amount_check" TO "budgets_amount_check";--> statement-breakpoint
ALTER TABLE "budgets" RENAME CONSTRAINT "budget_category_ids_check" TO "budgets_category_ids_check";--> statement-breakpoint
ALTER INDEX "budget_user_budget_period_unique" RENAME TO "budgets_user_budget_period_unique";