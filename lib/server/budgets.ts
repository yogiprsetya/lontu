import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { budgets, budgetVersions, categories } from "@/db/schema";
import { todayInJakarta } from "@/lib/date";
import { periodToYearMonth, yearMonthToPeriod } from "@/lib/period";
import type {
  Budget,
  BudgetCreateInput,
  BudgetSetInput,
  BudgetUpdateInput,
  BudgetVersion,
} from "@/lib/schemas/budget";
import type { SpendingType } from "@/lib/schemas/category";
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
  const owned = await findOwnedCategories(
    userId,
    items.map((i) => i.categoryId),
  );
  const valid = new Set(
    owned.filter((c) => c.kind === "spending" && !c.archivedAt).map((c) => c.id),
  );
  // Same message for foreign, unknown, archived and wrong-kind ids, so nothing leaks.
  if (items.some((i) => !valid.has(i.categoryId)))
    return { invalid: { field: "items", message: "Kategori tidak valid" } };

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
async function setDeleted(
  userId: string,
  id: string,
  deleted: boolean,
): Promise<Budget | undefined> {
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

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type VersionRow = typeof budgetVersions.$inferSelect;

export type InvalidCategories = { invalid: { field: "categoryIds"; message: string } };
export type BudgetWriteResult = BudgetVersion | InvalidCategories | { nameTaken: true };

const invalidCategories = (message: string): InvalidCategories => ({
  invalid: { field: "categoryIds", message },
});

function toBudgetVersion(row: VersionRow): BudgetVersion {
  return {
    id: row.budgetId,
    name: row.name,
    spendingType: row.spendingType as SpendingType,
    amount: row.amount,
    categoryIds: row.categoryIds,
    period: yearMonthToPeriod(row.year, row.month),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

/**
 * Serializes every budget write of one user until commit, so two requests cannot both pass
 * the "one category, one budget" check. Transaction-scoped, so it suits the pooler.
 */
async function lockBudgets(tx: Tx, userId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
}

/** Each budget's latest version at or before `period`, ended ones included. */
async function effectiveVersions(tx: Tx, userId: string, period: string) {
  const { year, month } = periodToYearMonth(period);
  return tx
    .selectDistinctOn([budgetVersions.budgetId])
    .from(budgetVersions)
    .where(
      and(
        eq(budgetVersions.userId, userId),
        sql`(${budgetVersions.year}, ${budgetVersions.month}) <= (${year}::int, ${month}::int)`,
      ),
    )
    .orderBy(budgetVersions.budgetId, desc(budgetVersions.year), desc(budgetVersions.month));
}

/**
 * Categories must be the user's, spending, of the budget's type, and active unless `kept`
 * (already in the budget's effective version). One message for every failure, so nothing leaks.
 */
async function checkCategories(
  executor: typeof db | Tx,
  userId: string,
  ids: string[],
  spendingType: SpendingType,
  kept: ReadonlySet<string> = new Set(),
) {
  const rows = await executor
    .select({
      id: categories.id,
      kind: categories.kind,
      spendingType: categories.spendingType,
      archivedAt: categories.archivedAt,
    })
    .from(categories)
    .where(and(eq(categories.userId, userId), inArray(categories.id, ids)));
  const valid = new Set(
    rows
      .filter(
        (c) =>
          c.kind === "spending" &&
          c.spendingType === spendingType &&
          (!c.archivedAt || kept.has(c.id)),
      )
      .map((c) => c.id),
  );
  return ids.every((id) => valid.has(id)) ? undefined : invalidCategories("Kategori tidak valid");
}

/** Another budget shown this month already has one of the categories or the name. */
function clash(
  shown: VersionRow[],
  { name, categoryIds }: { name: string; categoryIds: string[] },
  self?: string,
): InvalidCategories | { nameTaken: true } | undefined {
  const others = shown.filter((v) => v.budgetId !== self && !v.deletedAt);
  const taken = new Set(others.flatMap((v) => v.categoryIds));
  if (categoryIds.some((id) => taken.has(id)))
    return invalidCategories("Kategori sudah dipakai budget lain");
  if (others.some((v) => v.name.toLowerCase() === name.toLowerCase())) return { nameTaken: true };
}

const currentPeriod = () => todayInJakarta().slice(0, 7);

export async function createBudget(
  userId: string,
  input: BudgetCreateInput,
): Promise<BudgetWriteResult> {
  const period = currentPeriod();
  const invalid = await checkCategories(db, userId, input.categoryIds, input.spendingType);
  if (invalid) return invalid;

  return db.transaction(async (tx) => {
    await lockBudgets(tx, userId);
    const rejected = clash(await effectiveVersions(tx, userId, period), input);
    if (rejected) return rejected;

    const [row] = await tx
      .insert(budgetVersions)
      .values({ userId, budgetId: crypto.randomUUID(), ...periodToYearMonth(period), ...input })
      .returning();
    return toBudgetVersion(row);
  });
}

/**
 * Writes the current month's version from the effective one plus `input`. Saving twice in a
 * month updates that month's version, so earlier months keep what they showed.
 */
export async function updateBudget(
  userId: string,
  id: string,
  input: BudgetUpdateInput,
): Promise<BudgetWriteResult | undefined> {
  if (!z.uuid().safeParse(id).success) return undefined;
  const period = currentPeriod();

  return db.transaction(async (tx) => {
    await lockBudgets(tx, userId);
    const shown = await effectiveVersions(tx, userId, period);
    const current = shown.find((v) => v.budgetId === id);
    if (!current || current.deletedAt) return undefined;

    const next = {
      name: input.name ?? current.name,
      amount: input.amount ?? current.amount,
      categoryIds: input.categoryIds ?? current.categoryIds,
    };
    const spendingType = current.spendingType as SpendingType;
    if (input.categoryIds) {
      const kept = new Set(current.categoryIds);
      const invalid = await checkCategories(tx, userId, input.categoryIds, spendingType, kept);
      if (invalid) return invalid;
    }
    const rejected = clash(shown, next, id);
    if (rejected) return rejected;

    const [row] = await tx
      .insert(budgetVersions)
      .values({ userId, budgetId: id, spendingType, ...periodToYearMonth(period), ...next })
      .onConflictDoUpdate({
        target: [
          budgetVersions.userId,
          budgetVersions.budgetId,
          budgetVersions.year,
          budgetVersions.month,
        ],
        set: next,
      })
      .returning();
    return toBudgetVersion(row);
  });
}
