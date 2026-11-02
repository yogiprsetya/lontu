import "server-only";
import { and, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, goals } from "@/db/schema";
import { todayInJakarta } from "@/lib/date";
import { periodToYearMonth } from "@/lib/period";
import type { GoalCreateInput, GoalProgress } from "@/lib/schemas/goal";
import { goalProgress } from "@/lib/server/queries/goal-progress";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type InvalidAccounts = { invalid: { field: "accountIds"; message: string } };
export type GoalWriteResult = GoalProgress | InvalidAccounts | { nameTaken: true };

/**
 * Serializes every goal write of one user until commit, so two requests cannot both pass the
 * "one account, one active goal" check (SPEC-goals #10). Same key as the budget lock.
 */
async function lockGoals(tx: Tx, userId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
}

function otherActiveGoals(tx: Tx, userId: string, self?: string) {
  return tx
    .select({ id: goals.id, name: goals.name, accountIds: goals.accountIds })
    .from(goals)
    .where(
      and(
        eq(goals.userId, userId),
        isNull(goals.archivedAt),
        self ? ne(goals.id, self) : undefined,
      ),
    );
}

type OtherGoal = Awaited<ReturnType<typeof otherActiveGoals>>[number];

const nameClash = (others: OtherGoal[], name: string) =>
  others.some((g) => g.name.toLowerCase() === name.toLowerCase());

/**
 * Each account must be the user's, not a credit card, active unless `kept` (already in the
 * goal), and in no other active goal. The message names the first account that fails; a
 * foreign and a missing id read the same, so nothing leaks.
 */
async function checkAccounts(
  tx: Tx,
  userId: string,
  ids: string[],
  others: OtherGoal[],
  kept: ReadonlySet<string> = new Set(),
): Promise<InvalidAccounts | undefined> {
  const rows = await tx
    .select({
      id: accounts.id,
      name: accounts.name,
      subtype: accounts.subtype,
      archivedAt: accounts.archivedAt,
    })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), inArray(accounts.id, ids)));
  const byId = new Map(rows.map((a) => [a.id, a]));
  for (const id of ids) {
    const account = byId.get(id);
    const owner = others.find((g) => g.accountIds.includes(id));
    const message = !account
      ? "Akun tidak valid"
      : account.subtype === "credit_card"
        ? `${account.name} adalah kartu kredit dan tidak bisa dipakai target`
        : account.archivedAt && !kept.has(id)
          ? `${account.name} sudah diarsipkan`
          : owner
            ? `${account.name} sudah dipakai ${owner.name}`
            : undefined;
    if (message) return { invalid: { field: "accountIds", message } };
  }
}

function targetColumns(targetMonth: string | null) {
  if (targetMonth === null) return { targetYear: null, targetMonth: null };
  const { year, month } = periodToYearMonth(targetMonth);
  return { targetYear: year, targetMonth: month };
}

/** Read after the write commits, with the same rules as GET. */
export async function getGoalProgress(userId: string, id: string) {
  const all = await goalProgress(userId, { today: todayInJakarta(), includeArchived: true });
  return all.find((g) => g.id === id);
}

type Written = InvalidAccounts | { nameTaken: true } | { id: string };

/** The write ran in a transaction; the progress is read after commit so it sees the new row. */
async function afterWrite(userId: string, written: Written): Promise<GoalWriteResult> {
  if ("id" in written) return (await getGoalProgress(userId, written.id))!;
  return written;
}

export async function createGoal(userId: string, input: GoalCreateInput): Promise<GoalWriteResult> {
  const written = await db.transaction(async (tx): Promise<Written> => {
    await lockGoals(tx, userId);
    const others = await otherActiveGoals(tx, userId);
    const invalid = await checkAccounts(tx, userId, input.accountIds, others);
    if (invalid) return invalid;
    if (nameClash(others, input.name)) return { nameTaken: true };
    const [row] = await tx
      .insert(goals)
      .values({
        userId,
        name: input.name,
        targetAmount: input.targetAmount,
        accountIds: input.accountIds,
        ...targetColumns(input.targetMonth),
      })
      .returning({ id: goals.id });
    return { id: row.id };
  });
  return afterWrite(userId, written);
}
