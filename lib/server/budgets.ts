import "server-only";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { budgets, categories } from "@/db/schema";
import { todayInJakarta } from "@/lib/date";
import { periodToYearMonth, yearMonthToPeriod } from "@/lib/period";
import type { BudgetCreateInput, BudgetUpdateInput, BudgetVersion } from "@/lib/schemas/budget";
import type { SpendingType } from "@/lib/schemas/category";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type VersionRow = typeof budgets.$inferSelect;

type InvalidCategories = { invalid: { field: "categoryIds"; message: string } };
type BudgetWriteResult = BudgetVersion | InvalidCategories | { nameTaken: true };

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
    .selectDistinctOn([budgets.budgetId])
    .from(budgets)
    .where(
      and(
        eq(budgets.userId, userId),
        sql`(${budgets.year}, ${budgets.month}) <= (${year}::int, ${month}::int)`,
      ),
    )
    .orderBy(budgets.budgetId, desc(budgets.year), desc(budgets.month));
}

/**
 * Categories must be the user's, spending, of the budget's type, and active unless `kept`
 * (already in the budget's effective version). One message for every failure, so nothing leaks.
 */
async function checkCategories(
  tx: Tx,
  userId: string,
  ids: string[],
  spendingType: SpendingType,
  kept: ReadonlySet<string> = new Set(),
) {
  const rows = await tx
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

/**
 * Takes the write lock, then reads the month's effective versions. `current` is budget `id`'s,
 * and `inPeriod` says whether that version was written this month.
 */
async function lockedCurrent(tx: Tx, userId: string, id: string, period: string) {
  await lockBudgets(tx, userId);
  const shown = await effectiveVersions(tx, userId, period);
  const current = shown.find((v) => v.budgetId === id);
  const { year, month } = periodToYearMonth(period);
  const inPeriod = !!current && current.year === year && current.month === month;
  return { shown, current, inPeriod };
}

export async function createBudget(
  userId: string,
  input: BudgetCreateInput,
): Promise<BudgetWriteResult> {
  const period = currentPeriod();

  return db.transaction(async (tx) => {
    await lockBudgets(tx, userId);
    const invalid = await checkCategories(tx, userId, input.categoryIds, input.spendingType);
    if (invalid) return invalid;
    const rejected = clash(await effectiveVersions(tx, userId, period), input);
    if (rejected) return rejected;

    const [row] = await tx
      .insert(budgets)
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
    const { shown, current } = await lockedCurrent(tx, userId, id, period);
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
      .insert(budgets)
      .values({ userId, budgetId: id, spendingType, ...periodToYearMonth(period), ...next })
      .onConflictDoUpdate({
        target: [budgets.userId, budgets.budgetId, budgets.year, budgets.month],
        set: next,
      })
      .returning();
    return toBudgetVersion(row);
  });
}

/**
 * Ends a budget from the current month: earlier months keep their versions. coalesce keeps the
 * first deleted_at, so ending twice changes nothing; a budget ended before this month is 404.
 */
export async function endBudget(userId: string, id: string): Promise<BudgetVersion | undefined> {
  if (!z.uuid().safeParse(id).success) return undefined;
  const period = currentPeriod();

  return db.transaction(async (tx) => {
    const { current, inPeriod } = await lockedCurrent(tx, userId, id, period);
    if (!current || (current.deletedAt && !inPeriod)) return undefined;

    const [row] = inPeriod
      ? await tx
          .update(budgets)
          .set({ deletedAt: sql`coalesce(${budgets.deletedAt}, now())` })
          .where(eq(budgets.id, current.id))
          .returning()
      : await tx
          .insert(budgets)
          .values({
            userId,
            budgetId: id,
            name: current.name,
            spendingType: current.spendingType,
            amount: current.amount,
            categoryIds: current.categoryIds,
            ...periodToYearMonth(period),
            deletedAt: sql`now()`,
          })
          .returning();
    return toBudgetVersion(row);
  });
}

/**
 * Undoes an end made this month. Its name or categories may have gone to another budget since,
 * which is a conflict rather than a second owner.
 */
export async function restoreBudget(
  userId: string,
  id: string,
): Promise<BudgetVersion | { restoreConflict: true } | undefined> {
  if (!z.uuid().safeParse(id).success) return undefined;
  const period = currentPeriod();

  return db.transaction(async (tx) => {
    const { shown, current, inPeriod } = await lockedCurrent(tx, userId, id, period);
    if (!current) return undefined;
    if (!current.deletedAt) return toBudgetVersion(current);
    if (!inPeriod) return undefined;
    if (clash(shown, current, id)) return { restoreConflict: true as const };

    const [row] = await tx
      .update(budgets)
      .set({ deletedAt: null })
      .where(eq(budgets.id, current.id))
      .returning();
    return toBudgetVersion(row);
  });
}
