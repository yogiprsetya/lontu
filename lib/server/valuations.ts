import "server-only";
import { and, eq, inArray, isNull, max, sql } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { formatShortDate } from "@/lib/recurring-format";
import type { ValuationInput, ValuationResult } from "@/lib/schemas/valuation";
import { assetValuations } from "@/lib/server/queries/asset-valuations";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type Invalid = { invalid: { field: string; message: string } };

export type RecordResult = ValuationResult | Invalid;

/**
 * Balance on `date` (SPEC-goals #7): opening balance, every live adjustment whatever its date
 * (an adjustment corrects the opening balance), and every other live transaction up to `date`.
 */
async function balancesOn(tx: Tx, userId: string, ids: string[], date: string) {
  const rows = await tx.execute<{ id: string; balance: string }>(sql`
    select a.id, (a.initial_balance + coalesce(sum(case
        when t.type = 'adjustment'                          then t.amount
        when t.date > ${date}                               then 0
        when t.type in ('income', 'revaluation')            then t.amount
        when t.type in ('expense', 'saving')                then -t.amount
        when t.type = 'transfer' and t.account_id = a.id    then -t.amount
        when t.type = 'transfer' and t.to_account_id = a.id then t.amount
      end), 0))::bigint as balance
    from accounts a
    left join transactions t
      on t.deleted_at is null and (t.account_id = a.id or t.to_account_id = a.id)
    where a.user_id = ${userId} and a.id in ${ids}
    group by a.id
  `);
  return new Map(rows.map((r) => [r.id, Number(r.balance)]));
}

/** Why `account` cannot be valued, or undefined when it can. */
function accountProblem(account: { type: string; archivedAt: Date | null } | undefined) {
  // Same message for a foreign and a missing id, so it never confirms another user's account.
  if (!account) return "Akun tidak ditemukan";
  if (account.archivedAt) return "Akun sudah diarsipkan";
  if (account.type !== "asset") return "Hanya akun aset yang bisa diperbarui nilainya";
}

/** SPEC-goals #6: a changed value must come after the account's latest revaluation. */
function dateProblem(last: string | null | undefined, date: string) {
  if (!last || date > last) return;
  const day = formatShortDate(last, date);
  return date === last
    ? `Nilai sudah diperbarui tanggal ${day}. Revaluasi hanya sekali sehari.`
    : `Sudah ada nilai tanggal ${day}. Pilih tanggal sesudahnya.`;
}

export async function recordValuations(
  userId: string,
  input: ValuationInput,
): Promise<RecordResult> {
  const ids = input.items.map((i) => i.accountId);
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

    const balances = await balancesOn(tx, userId, ids, input.date);
    const changes = input.items
      .map(({ accountId, value }) => ({ accountId, amount: value - balances.get(accountId)! }))
      .filter((r) => r.amount !== 0);
    for (const { accountId } of changes) {
      const message = dateProblem(lastById.get(accountId), input.date);
      if (message) return { invalid: { field: "date", message } };
    }

    const rows = changes.map((r) => ({
      ...r,
      userId,
      type: "revaluation",
      date: input.date,
      description: "Pembaruan nilai",
    }));
    if (rows.length > 0) await tx.insert(transactions).values(rows);
    return { recorded: rows.length };
  });
  if ("invalid" in result) return result;
  // Read after commit, so the values include the rows just written.
  return { ...result, assets: await assetValuations(userId) };
}
