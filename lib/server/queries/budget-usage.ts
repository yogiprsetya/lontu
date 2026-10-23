import "server-only";
import { and, asc, eq, gte, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { budgetStatus } from "@/lib/budget-status";
import type { SpendingType } from "@/lib/schemas/category";
import {
  monthRange,
  periodToYearMonth,
  type BudgetGroup,
  type BudgetPeriod,
  type BudgetUsage,
  type BudgetUsageItem,
} from "@/lib/schemas/budget";

const emptyGroup = (): BudgetGroup => ({ budget: 0, spent: 0, unbudgetedSpent: 0 });

/**
 * One row per active spending category, plus archived ones that still have an active
 * budget or spending this month, so the total always equals the month's expense total.
 */
export async function budgetUsage(userId: string, period: BudgetPeriod): Promise<BudgetUsage> {
  const { from, to } = monthRange(period);
  const { year, month } = periodToYearMonth(period);

  const spending = db.$with("spending").as(
    db
      .select({
        categoryId: transactions.categoryId,
        spent: sql<number>`sum(${transactions.amount})::bigint`.as("spent"),
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          isNull(transactions.deletedAt),
          eq(transactions.type, "expense"),
          gte(transactions.date, from),
          lte(transactions.date, to),
        ),
      )
      .groupBy(transactions.categoryId),
  );

  const rows = await db
    .with(spending)
    .select({
      categoryId: categories.id,
      spendingType: categories.spendingType,
      budgetId: budgets.id,
      budget: budgets.amount,
      spent: sql<number>`coalesce(${spending.spent}, 0)`.mapWith(Number),
    })
    .from(categories)
    .leftJoin(
      budgets,
      and(
        eq(budgets.categoryId, categories.id),
        eq(budgets.userId, userId),
        eq(budgets.year, year),
        eq(budgets.month, month),
        isNull(budgets.deletedAt),
      ),
    )
    .leftJoin(spending, eq(spending.categoryId, categories.id))
    .where(
      and(
        eq(categories.userId, userId),
        eq(categories.kind, "spending"),
        or(isNull(categories.archivedAt), isNotNull(budgets.id), isNotNull(spending.categoryId)),
      ),
    )
    .orderBy(asc(categories.spendingType), sql`lower(${categories.name})`);

  const summary = { needs: emptyGroup(), wants: emptyGroup(), total: emptyGroup() };
  const items = rows.map((row): BudgetUsageItem => {
    const spendingType = row.spendingType as SpendingType;
    for (const group of [summary[spendingType], summary.total]) {
      group.budget += row.budget ?? 0;
      group.spent += row.spent;
      if (row.budget === null) group.unbudgetedSpent += row.spent;
    }
    return { ...row, spendingType, ...budgetStatus(row.budget, row.spent) };
  });

  return { period, items, summary };
}
