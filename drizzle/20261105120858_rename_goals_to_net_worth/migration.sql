ALTER TABLE "goals" RENAME TO "net_worth";--> statement-breakpoint
ALTER TABLE "net_worth" RENAME CONSTRAINT "goals_amount_check" TO "net_worth_amount_check";--> statement-breakpoint
ALTER TABLE "net_worth" RENAME CONSTRAINT "goals_target_check" TO "net_worth_target_check";--> statement-breakpoint
ALTER TABLE "net_worth" RENAME CONSTRAINT "goals_account_ids_check" TO "net_worth_account_ids_check";--> statement-breakpoint
ALTER INDEX "goals_user_idx" RENAME TO "net_worth_user_idx";--> statement-breakpoint
ALTER TABLE "net_worth" RENAME CONSTRAINT "goals_pkey" TO "net_worth_pkey";--> statement-breakpoint
ALTER TABLE "net_worth" RENAME CONSTRAINT "goals_user_id_users_id_fkey" TO "net_worth_user_id_users_id_fkey";
