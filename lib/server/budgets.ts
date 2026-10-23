import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { periodToYearMonth, yearMonthToPeriod, type Budget, type BudgetSetInput } from "@/lib/schemas/budget";
import { findOwnedCategories } from "@/lib/server/ownership";

type Row = typeof budgets.$inferSelect;

function toBudget(row: Row): Budget {
  return {
    id: row.id,
    categoryId: row.categoryId,
    period: yearMonthToPeriod(row.year, row.month),
    amount: row.amount,
    createdAt: row.createdAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

/**
 * Upserts on (category, month), reviving a soft-deleted row, so replaying the same PUT is
 * harmless. Every category is checked before the single insert, so a bad item writes nothing.
 */
export async function setBudgets(
  userId: string,
  { period, items }: BudgetSetInput,
): Promise<Budget[] | { invalid: { field: "items"; message: string } }> {
  const owned = await findOwnedCategories(userId, items.map((i) => i.categoryId));
  const valid = new Set(owned.filter((c) => c.kind === "spending" && !c.archivedAt).map((c) => c.id));
  // Same message for foreign, unknown, archived and wrong-kind ids, so nothing leaks.
  if (items.some((i) => !valid.has(i.categoryId))) return { invalid: { field: "items", message: "Kategori tidak valid" } };

  const { year, month } = periodToYearMonth(period);
  const rows = await db
    .insert(budgets)
    .values(items.map((i) => ({ userId, categoryId: i.categoryId, year, month, amount: i.amount })))
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId, budgets.year, budgets.month],
      set: { amount: sql`excluded.amount`, deletedAt: null },
    })
    .returning();

  const byCategory = new Map(rows.map((r) => [r.categoryId, r]));
  return items.map((i) => toBudget(byCategory.get(i.categoryId)!));
}
