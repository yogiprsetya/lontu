import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { recurringRules, users } from "@/db/schema";
import { firstDueOnOrAfter } from "@/lib/recurring-schedule";
import { CATEGORY_KIND_FOR } from "@/lib/schemas/category";
import type { RecurringCreateInput, RecurringRule, RecurringType } from "@/lib/schemas/recurring";
import { findOwnedAccounts, findOwnedCategory } from "@/lib/server/ownership";

type Row = typeof recurringRules.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type InvalidReference = { field: "accountId" | "categoryId"; message: string };

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
): Promise<InvalidReference | undefined> {
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
): Promise<{ rule: RecurringRule } | { invalid: InvalidReference }> {
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
