import "server-only";
import { and, asc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { monthRange, periodToYearMonth, type BudgetPeriod } from "@/lib/schemas/budget";
import type { SpendingType } from "@/lib/schemas/category";
import { shiftPeriod } from "@/lib/transaction-filters";

/**
 * The three full months before `period`. shiftPeriod stops at 2000-01, so near that floor the
 * window shrinks, and it is empty when there is no earlier month at all.
 */
export function historyWindow(period: BudgetPeriod) {
  const last = shiftPeriod(period, -1);
  if (last === period) return null;
  const first = shiftPeriod(shiftPeriod(last, -1), -1);
  return { from: monthRange(first).from, to: monthRange(last).to };
}

/**
 * Active spending categories in display order, each with its expense total over the window
 * and its active budget in `period`. Aggregated in SQL: no transaction rows reach TS.
 */
export async function budgetHistory(userId: string, period: BudgetPeriod) {
  const window = historyWindow(period);
  const { year, month } = periodToYearMonth(period);

  const rows = await db
    .select({
      id: categories.id,
      spendingType: categories.spendingType,
      spent: sql<number>`coalesce(sum(${transactions.amount}), 0)::bigint`.mapWith(Number),
      current: budgets.amount,
    })
    .from(categories)
    .leftJoin(
      transactions,
      window
        ? and(
            eq(transactions.categoryId, categories.id),
            eq(transactions.userId, userId),
            eq(transactions.type, "expense"),
            isNull(transactions.deletedAt),
            gte(transactions.date, window.from),
            lte(transactions.date, window.to),
          )
        : sql`false`,
    )
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
    .where(and(eq(categories.userId, userId), eq(categories.kind, "spending"), isNull(categories.archivedAt)))
    .groupBy(categories.id, budgets.amount)
    .orderBy(asc(categories.spendingType), sql`lower(${categories.name})`);

  return {
    categories: rows.map((r) => ({ id: r.id, spendingType: r.spendingType as SpendingType })),
    history: Object.fromEntries(rows.map((r) => [r.id, r.spent])),
    current: Object.fromEntries(rows.map((r) => [r.id, r.current])),
  };
}
