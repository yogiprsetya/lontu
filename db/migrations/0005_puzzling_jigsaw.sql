ALTER TABLE "recurring_configs" DROP CONSTRAINT "recurring_configs_expense_id_expenses_id_fk";
--> statement-breakpoint
ALTER TABLE "recurring_configs" DROP COLUMN "expense_id";