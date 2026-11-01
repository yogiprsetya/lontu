DROP VIEW "account_balances";--> statement-breakpoint
CREATE INDEX "transactions_user_account_type_idx" ON "transactions" ("user_id","account_id","type","date");--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_type_check", ADD CONSTRAINT "transactions_type_check" CHECK ("type" in ('income', 'expense', 'saving', 'transfer', 'adjustment', 'revaluation'));--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_amount_check", ADD CONSTRAINT "transactions_amount_check" CHECK (case when "type" in ('adjustment', 'revaluation') then "amount" <> 0 else "amount" > 0 end);--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_category_check", ADD CONSTRAINT "transactions_category_check" CHECK (("type" in ('transfer', 'adjustment', 'revaluation')) = ("category_id" is null));--> statement-breakpoint
CREATE VIEW "account_balances" WITH (security_invoker = true) AS (
    select a.id as account_id, a.user_id,
      a.initial_balance + coalesce(sum(case
        when t.type in ('income', 'adjustment', 'revaluation') then t.amount
        when t.type in ('expense', 'saving')                   then -t.amount
        when t.type = 'transfer' and t.account_id = a.id       then -t.amount
        when t.type = 'transfer' and t.to_account_id = a.id    then t.amount
      end), 0)::bigint as balance
    from accounts a
    left join transactions t
      on t.deleted_at is null and (t.account_id = a.id or t.to_account_id = a.id)
    group by a.id
  );