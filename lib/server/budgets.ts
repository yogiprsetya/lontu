import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { budgets } from "@/db/schema";
import { periodToYearMonth, yearMonthToPeriod, type Budget, type BudgetPeriod, type BudgetSetInput } from "@/lib/schemas/budget";
import { findOwnedCategories } from "@/lib/server/ownership";
import { shiftPeriod } from "@/lib/transaction-filters";

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

// coalesce keeps the first deleted_at, so repeating a delete changes nothing.
async function setDeleted(userId: string, id: string, deleted: boolean): Promise<Budget | undefined> {
  if (!z.uuid().safeParse(id).success) return undefined;
  const [row] = await db
    .update(budgets)
    .set({ deletedAt: deleted ? sql`coalesce(${budgets.deletedAt}, now())` : null })
    .where(and(eq(budgets.id, id), eq(budgets.userId, userId)))
    .returning();
  return row && toBudget(row);
}

export const softDeleteBudget = (userId: string, id: string) => setDeleted(userId, id, true);
// Allowed even when the category is archived: it brings back an old budget, not a new one.
export const restoreBudget = (userId: string, id: string) => setDeleted(userId, id, false);

/**
 * Copies last month's active budgets of active spending categories into `to`, one statement.
 * The `where` on `do update` leaves active target budgets alone and only revives deleted ones,
 * so `returning` counts exactly the rows written and a second copy writes nothing.
 */
export async function copyBudgets(userId: string, to: BudgetPeriod): Promise<{ copied: number }> {
  const from = shiftPeriod(to, -1);
  if (from === to) return { copied: 0 };
  const source = periodToYearMonth(from);
  const target = periodToYearMonth(to);

  const rows = await db.execute(sql`
    insert into budgets (user_id, category_id, year, month, amount)
    select b.user_id, b.category_id, ${target.year}::int, ${target.month}::int, b.amount
    from budgets b
    join categories c on c.id = b.category_id and c.user_id = b.user_id
    where b.user_id = ${userId}
      and b.year = ${source.year} and b.month = ${source.month}
      and b.deleted_at is null
      and c.archived_at is null and c.kind = 'spending'
    on conflict (user_id, category_id, year, month)
      do update set amount = excluded.amount, deleted_at = null
      where budgets.deleted_at is not null
    returning id
  `);
  return { copied: rows.length };
}
