import "server-only";
import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { recurringRules, users } from "@/db/schema";
import { advanceDate, firstDueOnOrAfter } from "@/lib/recurring-schedule";
import { CATEGORY_KIND_FOR } from "@/lib/schemas/category";
import type {
  AdvanceResult,
  RecurringAdvanceInput,
  RecurringCreateInput,
  RecurringRule,
  RecurringType,
  RecurringUpdateInput,
} from "@/lib/schemas/recurring";
import type { Transaction } from "@/lib/schemas/transaction";
import {
  checkAccounts,
  checkCategory,
  findReplay,
  IdConflict,
  insertSimple,
  type InvalidReference,
} from "@/lib/server/transactions";

const isUuid = (id: string) => z.uuid().safeParse(id).success;

type Row = typeof recurringRules.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type InvalidField = InvalidReference | { field: "isPayday"; message: string };

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

/** The transactions checks, so a rule and the transaction it records are validated alike. Omitted refs are skipped. */
export async function checkReferences(
  userId: string,
  type: RecurringType,
  refs: { accountId?: string; categoryId?: string },
): Promise<InvalidReference | undefined> {
  const [account, category] = await Promise.all([
    refs.accountId ? checkAccounts(userId, { accountId: refs.accountId }) : undefined,
    refs.categoryId
      ? checkCategory(userId, refs.categoryId, CATEGORY_KIND_FOR[type], "categoryId")
      : undefined,
  ]);
  return account ?? category;
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

function liveRule(userId: string, id: string) {
  return and(ownedRule(userId, id), isNull(recurringRules.archivedAt));
}

async function currentRule(userId: string, id: string) {
  const [row] = await db.select().from(recurringRules).where(liveRule(userId, id));
  return row;
}

export type UpdateRuleResult =
  { rule: RecurringRule } | { invalid: InvalidField } | { notFound: true };

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
  const row = await currentRule(userId, id);
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
    // Unconditional: `row` was read outside this transaction, so its flag may already be stale.
    if (input.isPayday) await clearPayday(tx, userId);
    const [r] = await tx
      .update(recurringRules)
      .set({ ...input, ...(nextDueDate && { nextDueDate }), updatedAt: sql`now()` })
      .where(liveRule(userId, id))
      .returning();
    return r;
  });
  return updated ? { rule: toRule(updated) } : { notFound: true };
}

/** Archiving also drops the payday flag, so a later restore never clashes with a newer payday. */
export async function setRuleArchived(
  userId: string,
  id: string,
  archived: boolean,
): Promise<RecurringRule | undefined> {
  if (!isUuid(id)) return undefined;
  const [row] = await db
    .update(recurringRules)
    // coalesce keeps the original timestamp when archiving twice.
    .set(
      archived
        ? { archivedAt: sql`coalesce(${recurringRules.archivedAt}, now())`, isPayday: false }
        : { archivedAt: null },
    )
    .where(ownedRule(userId, id))
    .returning();
  return row && toRule(row);
}

export type AdvanceOutcome =
  | { result: AdvanceResult }
  | { notFound: true }
  | { stale: true }
  | { idTaken: true }
  | { invalid: InvalidField };

/** Thrown inside the advance transaction when the rule has moved past the occurrence, to roll it back. */
class Stale extends Error {}

type PostInput = Extract<RecurringAdvanceInput, { action: "post" }>;

/**
 * A post stored under this client id, only when it is the record of this very request: transactions
 * carry no rule id, so the stored row must equal the request and the rule must be exactly one step
 * past the occurrence. Anything else is an id reused from elsewhere.
 */
async function findPostReplay(userId: string, rule: Row, input: PostInput) {
  const replay = await findReplay(userId, input.id);
  if (!replay) return undefined;
  if ("idTaken" in replay) return replay;
  const t = replay.transaction;
  const matches =
    !replay.fee &&
    t.type === rule.type &&
    t.amount === input.amount &&
    t.date === input.date &&
    t.accountId === input.accountId &&
    t.categoryId === input.categoryId &&
    t.description === input.description &&
    rule.nextDueDate === advanceDate(rule.dayOfMonth, input.occurrenceDate);
  return matches ? { result: { rule: toRule(rule), transaction: t } } : { idTaken: true as const };
}

/**
 * Catat (post) or Lewati (skip) one occurrence. The rule only moves when `occurrenceDate` is still
 * its next due date, and for a post the move and the transaction insert commit together. As in
 * createTransaction, the replay check runs before the reference checks, so a retry after the
 * account was archived still replays.
 */
export async function advanceRule(
  userId: string,
  id: string,
  input: RecurringAdvanceInput,
): Promise<AdvanceOutcome> {
  if (!isUuid(id)) return { notFound: true };
  const rule = await currentRule(userId, id);
  if (!rule) return { notFound: true };
  const type = rule.type as RecurringType;

  if (input.action === "post") {
    const replay = await findPostReplay(userId, rule, input);
    if (replay) return replay;
    const invalid = await checkReferences(userId, type, input);
    if (invalid) return { invalid };
  }

  try {
    return await db.transaction(async (tx) => {
      const [moved] = await tx
        .update(recurringRules)
        .set({
          nextDueDate: advanceDate(rule.dayOfMonth, input.occurrenceDate),
          updatedAt: sql`now()`,
        })
        .where(and(liveRule(userId, id), eq(recurringRules.nextDueDate, input.occurrenceDate)))
        .returning();
      if (!moved) throw new Stale();

      let transaction: Transaction | null = null;
      if (input.action === "post") {
        const { id: txId, amount, date, accountId, categoryId, description } = input;
        ({ transaction } = await insertSimple(
          userId,
          { type, id: txId, amount, date, accountId, categoryId, description },
          tx,
        ));
      }
      return { result: { rule: toRule(moved), transaction } };
    });
  } catch (err) {
    if (err instanceof IdConflict) return { idTaken: true };
    if (!(err instanceof Stale)) throw err;
    // A concurrent retry of this same post may be what moved the rule.
    if (input.action === "post") {
      const latest = await currentRule(userId, id);
      const replay = latest && (await findPostReplay(userId, latest, input));
      if (replay && "result" in replay) return replay;
    }
    return { stale: true };
  }
}
