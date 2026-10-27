import "server-only";
import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { recurringRules, users } from "@/db/schema";
import { firstDueOnOrAfter } from "@/lib/recurring-schedule";
import { CATEGORY_KIND_FOR } from "@/lib/schemas/category";
import type { RecurringCreateInput, RecurringRule, RecurringType, RecurringUpdateInput } from "@/lib/schemas/recurring";
import { findOwnedAccounts, findOwnedCategory } from "@/lib/server/ownership";

const isUuid = (id: string) => z.uuid().safeParse(id).success;

type Row = typeof recurringRules.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type InvalidField = { field: "accountId" | "categoryId" | "isPayday"; message: string };

export function toRule(row: Row): RecurringRule {
  return {
    id: row.id,
    type: row.type as RecurringType,
    name: row.name,
    amount: row.amount,
    accountId: row.accountId,
    categoryId: row.categoryId,
    dayOfMonth: row.dayOfMonth,
    nextDueDate: row.nextDueDate,
    isPayday: row.isPayday,
    archivedAt: row.archivedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

// Same messages as transactions: foreign and unknown ids are indistinguishable.
export async function checkReferences(
  userId: string,
  type: RecurringType,
  refs: { accountId?: string; categoryId?: string },
): Promise<InvalidField | undefined> {
  const [owned, category] = await Promise.all([
    refs.accountId ? findOwnedAccounts(userId, [refs.accountId]) : undefined,
    refs.categoryId ? findOwnedCategory(userId, refs.categoryId) : undefined,
  ]);
  if (owned) {
    if (!owned[0]) return { field: "accountId", message: "Akun tidak ditemukan" };
    if (owned[0].archivedAt) return { field: "accountId", message: "Akun sudah diarsipkan" };
  }
  if (refs.categoryId) {
    if (!category) return { field: "categoryId", message: "Kategori tidak ditemukan" };
    if (category.archivedAt) return { field: "categoryId", message: "Kategori sudah diarsipkan" };
    if (category.kind !== CATEGORY_KIND_FOR[type]) return { field: "categoryId", message: "Kategori tidak sesuai dengan jenis aturan" };
  }
}

/**
 * Clears the user's current payday flag. Locking the user row first serializes concurrent
 * payday changes, so the partial unique index never sees two active paydays at once.
 */
export async function clearPayday(tx: Tx, userId: string) {
  await tx.select({ id: users.id }).from(users).where(eq(users.id, userId)).for("update");
  await tx
    .update(recurringRules)
    .set({ isPayday: false })
    .where(and(eq(recurringRules.userId, userId), eq(recurringRules.isPayday, true)));
}

export async function createRule(
  userId: string,
  input: RecurringCreateInput,
  today: string,
): Promise<{ rule: RecurringRule } | { invalid: InvalidField }> {
  const invalid = await checkReferences(userId, input.type, input);
  if (invalid) return { invalid };

  const row = await db.transaction(async (tx) => {
    if (input.isPayday) await clearPayday(tx, userId);
    const [inserted] = await tx
      .insert(recurringRules)
      .values({ userId, ...input, nextDueDate: firstDueOnOrAfter(input.dayOfMonth, today) })
      .returning();
    return inserted;
  });
  return { rule: toRule(row) };
}

function ownedRule(userId: string, id: string) {
  return and(eq(recurringRules.id, id), eq(recurringRules.userId, userId));
}

export type UpdateRuleResult = { rule: RecurringRule } | { invalid: InvalidField } | { notFound: true };

/**
 * Only references the request changes are re-checked, so a rule whose account was archived
 * later can still be edited. A new dayOfMonth drops any missed occurrences (spec decision #14).
 */
export async function updateRule(
  userId: string,
  id: string,
  input: RecurringUpdateInput,
  today: string,
): Promise<UpdateRuleResult> {
  if (!isUuid(id)) return { notFound: true };
  const live = and(ownedRule(userId, id), isNull(recurringRules.archivedAt));
  const [row] = await db.select().from(recurringRules).where(live);
  if (!row) return { notFound: true };

  const type = row.type as RecurringType;
  if (input.isPayday && type !== "income") {
    return { invalid: { field: "isPayday", message: "Hanya aturan income yang bisa jadi gajian" } };
  }
  const invalid = await checkReferences(userId, type, {
    accountId: input.accountId !== row.accountId ? input.accountId : undefined,
    categoryId: input.categoryId !== row.categoryId ? input.categoryId : undefined,
  });
  if (invalid) return { invalid };

  const nextDueDate =
    input.dayOfMonth !== undefined && input.dayOfMonth !== row.dayOfMonth
      ? firstDueOnOrAfter(input.dayOfMonth, today)
      : undefined;
  const updated = await db.transaction(async (tx) => {
    if (input.isPayday && !row.isPayday) await clearPayday(tx, userId);
    const [r] = await tx
      .update(recurringRules)
      .set({ ...input, ...(nextDueDate && { nextDueDate }), updatedAt: sql`now()` })
      .where(live)
      .returning();
    return r;
  });
  return updated ? { rule: toRule(updated) } : { notFound: true };
}

/** Archiving also drops the payday flag, so a later restore never clashes with a newer payday. */
export async function setRuleArchived(userId: string, id: string, archived: boolean): Promise<RecurringRule | undefined> {
  if (!isUuid(id)) return undefined;
  const [row] = await db
    .update(recurringRules)
    // coalesce keeps the original timestamp when archiving twice.
    .set(archived ? { archivedAt: sql`coalesce(${recurringRules.archivedAt}, now())`, isPayday: false } : { archivedAt: null })
    .where(ownedRule(userId, id))
    .returning();
  return row && toRule(row);
}
