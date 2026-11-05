import "server-only";
import { and, eq, inArray, isNull, max } from "drizzle-orm";
import { db } from "@/db";
import { accountBalances, accounts, transactions } from "@/db/schema";
import { todayInJakarta } from "@/lib/date";
import type { ValuationInput, ValuationResult } from "@/lib/schemas/valuation";
import { assetValuations } from "@/lib/server/queries/asset-valuations";

type Invalid = { invalid: { field: string; message: string } };

export type RecordResult = ValuationResult | Invalid;

/** Why `account` cannot be valued, or undefined when it can. */
function accountProblem(account: { type: string; archivedAt: Date | null } | undefined) {
  // Same message for a foreign and a missing id, so it never confirms another user's account.
  if (!account) return "Akun tidak ditemukan";
  if (account.archivedAt) return "Akun sudah diarsipkan";
  if (account.type !== "asset") return "Hanya akun aset yang bisa diperbarui nilainya";
}

/** SPEC-net-worth #6: one changed value per account per day. `>=` also holds back any future-dated row. */
function dateProblem(last: string | null | undefined, today: string) {
  if (last && last >= today)
    return "Nilai sudah diperbarui hari ini. Revaluasi hanya sekali sehari.";
}

export async function recordValuations(
  userId: string,
  input: ValuationInput,
): Promise<RecordResult> {
  const ids = input.items.map((i) => i.accountId);
  const today = todayInJakarta();
  const result = await db.transaction(async (tx): Promise<Invalid | { recorded: number }> => {
    // Fixed lock order, so two check-ins over the same accounts cannot deadlock.
    const locked = await tx
      .select({ id: accounts.id, type: accounts.type, archivedAt: accounts.archivedAt })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), inArray(accounts.id, ids)))
      .orderBy(accounts.id)
      .for("update");
    const byId = new Map(locked.map((a) => [a.id, a]));
    for (const [i, { accountId }] of input.items.entries()) {
      const message = accountProblem(byId.get(accountId));
      if (message) return { invalid: { field: `items.${i}`, message } };
    }

    // Separate statements from the lock: under READ COMMITTED they get a fresh snapshot,
    // so they see revaluations committed by whoever held the lock before us.
    const lastRows = await tx
      .select({ accountId: transactions.accountId, last: max(transactions.date) })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          inArray(transactions.accountId, ids),
          eq(transactions.type, "revaluation"),
          isNull(transactions.deletedAt),
        ),
      )
      .groupBy(transactions.accountId);
    const lastById = new Map(lastRows.map((r) => [r.accountId, r.last]));

    const balanceRows = await tx
      .select({ accountId: accountBalances.accountId, balance: accountBalances.balance })
      .from(accountBalances)
      .where(and(eq(accountBalances.userId, userId), inArray(accountBalances.accountId, ids)));
    const balances = new Map(balanceRows.map((r) => [r.accountId, r.balance]));
    const changes = input.items
      .map(({ accountId, value, note }, i) => ({
        i,
        accountId,
        note,
        amount: value - balances.get(accountId)!,
      }))
      .filter((r) => r.amount !== 0);
    for (const { i, accountId } of changes) {
      const message = dateProblem(lastById.get(accountId), today);
      if (message) return { invalid: { field: `items.${i}`, message } };
    }

    const rows = changes.map(({ accountId, amount, note }) => ({
      accountId,
      amount,
      userId,
      type: "revaluation",
      date: today,
      description: note ?? null,
    }));
    if (rows.length > 0) await tx.insert(transactions).values(rows);
    return { recorded: rows.length };
  });
  if ("invalid" in result) return result;
  // Read after commit, so the values include the rows just written.
  return { ...result, assets: await assetValuations(userId) };
}
