import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { budgetStatus, summarizeBudgetUsage } from "@/lib/budget-status";
import { monthRange, periodToYearMonth } from "@/lib/period";
import type { BudgetPeriod } from "@/lib/schemas/budget";
import type { BudgetUsage, BudgetUsageItem, UnbudgetedSpending } from "@/lib/schemas/budget-usage";

type Row = {
  items: Omit<BudgetUsageItem, "remaining" | "percent" | "status">[] | null;
  unbudgeted: UnbudgetedSpending[] | null;
};

/**
 * Each budget's effective version in `period` is its latest version at or before that month;
 * an effective version with `deleted_at` means the budget has ended. Built as JSON in one
 * statement, so bigint sums arrive as numbers and no transaction row reaches TS.
 */
export async function budgetUsage(userId: string, period: BudgetPeriod): Promise<BudgetUsage> {
  const { from, to } = monthRange(period);
  const { year, month } = periodToYearMonth(period);

  const [row] = await db.execute<Row>(sql`
    with effective as (
      select distinct on (budget_id) budget_id, name, spending_type, amount, category_ids, deleted_at
      from budget_versions
      where user_id = ${userId} and (year, month) <= (${year}::int, ${month}::int)
      order by budget_id, year desc, month desc
    ),
    shown as (select * from effective where deleted_at is null),
    spending as (
      select category_id, sum(amount)::bigint as spent
      from transactions
      where user_id = ${userId} and deleted_at is null and type = 'expense'
        and date between ${from} and ${to}
      group by category_id
    ),
    budget_categories as (
      select s.budget_id, bc.category_id, coalesce(sp.spent, 0)::bigint as spent, lower(c.name) as sort_name
      from shown s
      cross join unnest(s.category_ids) as bc(category_id)
      left join categories c on c.id = bc.category_id and c.user_id = ${userId}
      left join spending sp on sp.category_id = bc.category_id
    ),
    items as (
      select s.budget_id, s.name, s.spending_type, s.amount,
        sum(bc.spent)::bigint as spent,
        json_agg(json_build_object('categoryId', bc.category_id, 'spent', bc.spent)
          order by bc.sort_name, bc.category_id) as categories
      from shown s
      join budget_categories bc on bc.budget_id = s.budget_id
      group by s.budget_id, s.name, s.spending_type, s.amount
    )
    select
      (select json_agg(json_build_object(
          'budgetId', budget_id, 'name', name, 'spendingType', spending_type,
          'budget', amount, 'spent', spent, 'categories', categories)
        order by spending_type, lower(name), budget_id)
       from items) as items,
      (select json_agg(json_build_object(
          'categoryId', c.id, 'spendingType', c.spending_type, 'spent', sp.spent)
        order by c.spending_type, lower(c.name), c.id)
       from spending sp
       join categories c on c.id = sp.category_id and c.user_id = ${userId} and c.kind = 'spending'
       where not exists (select 1 from budget_categories bc where bc.category_id = sp.category_id)
      ) as unbudgeted
  `);

  const items = (row.items ?? []).map(
    (item): BudgetUsageItem =>
      ({ ...item, ...budgetStatus(item.budget, item.spent) }) as BudgetUsageItem,
  );
  const unbudgeted = row.unbudgeted ?? [];
  return { period, items, unbudgeted, summary: summarizeBudgetUsage(items, unbudgeted) };
}
