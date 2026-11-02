import "server-only";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { accountBalances, accounts, goals, transactions } from "@/db/schema";
import type { AssetValuation } from "@/lib/schemas/valuation";

/** Active asset accounts in `GET /api/accounts` order (lower(name), all being assets). */
export async function assetValuations(userId: string): Promise<AssetValuation[]> {
  const rows = await db
    .select({
      accountId: accounts.id,
      balance: accountBalances.balance,
      marketGain: sql<number>`coalesce(sum(${transactions.amount}), 0)::bigint`.mapWith(Number),
      lastValuedAt: sql<string | null>`max(${transactions.date})::text`,
      // At most one active goal per account (SPEC-goals #10); the oldest wins should that ever break.
      goalId: sql<string | null>`(
        select g.id from ${goals} g
        where g.user_id = ${userId} and g.archived_at is null and "accounts"."id" = any(g.account_ids)
        order by g.created_at, g.id limit 1
      )`,
    })
    .from(accounts)
    .innerJoin(accountBalances, eq(accountBalances.accountId, accounts.id))
    .leftJoin(
      transactions,
      and(
        eq(transactions.accountId, accounts.id),
        eq(transactions.type, "revaluation"),
        isNull(transactions.deletedAt),
      ),
    )
    .where(
      and(eq(accounts.userId, userId), eq(accounts.type, "asset"), isNull(accounts.archivedAt)),
    )
    .groupBy(accounts.id, accountBalances.balance)
    .orderBy(sql`lower(${accounts.name})`);
  return rows.map((r) => ({ ...r, contributed: r.balance - r.marketGain }));
}
