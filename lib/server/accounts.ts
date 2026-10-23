import "server-only";
import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { accountBalances, accounts, transactions } from "@/db/schema";
import { todayInJakarta } from "@/lib/date";
import type {
  Account,
  AccountCreateInput,
  AccountSubtype,
  AccountType,
  AccountUpdateInput,
} from "@/lib/schemas/account";

// The outer reference is spelled out: in a single-table select Drizzle renders
// ${accounts.id} as a bare "id", which inside the subquery would bind to t.id.
const effectiveInitialBalance = sql<number>`(${accounts.initialBalance} + coalesce((
  select sum(t.amount) from transactions t
  where t.account_id = "accounts"."id" and t.type = 'adjustment' and t.deleted_at is null
), 0))::bigint`.mapWith(Number);

async function selectAccounts(where: SQL | undefined): Promise<Account[]> {
  const rows = await db
    .select({
      id: accounts.id,
      name: accounts.name,
      type: accounts.type,
      subtype: accounts.subtype,
      initialBalance: effectiveInitialBalance,
      balance: accountBalances.balance,
      archivedAt: accounts.archivedAt,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .innerJoin(accountBalances, eq(accountBalances.accountId, accounts.id))
    .where(where)
    .orderBy(sql`case ${accounts.type} when 'transaction' then 0 else 1 end`, sql`lower(${accounts.name})`);
  return rows.map((r) => ({
    ...r,
    type: r.type as AccountType,
    subtype: r.subtype as AccountSubtype | null,
    archivedAt: r.archivedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export function listAccounts(userId: string, { includeArchived = false } = {}) {
  return selectAccounts(and(eq(accounts.userId, userId), includeArchived ? undefined : isNull(accounts.archivedAt)));
}

export async function getAccount(userId: string, id: string): Promise<Account | undefined> {
  const [account] = await selectAccounts(and(eq(accounts.userId, userId), eq(accounts.id, id)));
  return account;
}

/** Returns undefined when the name is already taken (archived accounts included). */
export async function createAccount(userId: string, input: AccountCreateInput) {
  const [row] = await db
    .insert(accounts)
    .values({ userId, ...input })
    .onConflictDoNothing()
    .returning({ id: accounts.id });
  return row && getAccount(userId, row.id);
}

/**
 * Returns undefined when the account is not the user's. A name clash throws a
 * unique violation on accounts_user_name_unique and rolls back any adjustment.
 */
export async function updateAccount(userId: string, id: string, input: AccountUpdateInput) {
  const { initialBalance, ...fields } = input;
  const owned = and(eq(accounts.userId, userId), eq(accounts.id, id));
  const found = await db.transaction(async (tx) => {
    const [locked] = await tx.select({ id: accounts.id }).from(accounts).where(owned).for("update");
    if (!locked) return false;

    if (initialBalance !== undefined) {
      // Separate statement from the lock: under READ COMMITTED it gets a fresh
      // snapshot, so it sees adjustments committed by whoever held the lock before us.
      const [{ current }] = await tx.select({ current: effectiveInitialBalance }).from(accounts).where(owned);
      const delta = initialBalance - current;
      if (delta !== 0) {
        await tx.insert(transactions).values({
          userId,
          type: "adjustment",
          amount: delta,
          date: todayInJakarta(),
          accountId: id,
          description: "Penyesuaian saldo awal",
        });
      }
    }
    if (Object.keys(fields).length > 0) await tx.update(accounts).set(fields).where(owned);
    return true;
  });
  return found ? getAccount(userId, id) : undefined;
}

export async function setAccountArchived(userId: string, id: string, archived: boolean) {
  const [row] = await db
    .update(accounts)
    // coalesce keeps the original timestamp when archiving twice.
    .set({ archivedAt: archived ? sql`coalesce(${accounts.archivedAt}, now())` : null })
    .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
    .returning({ id: accounts.id });
  return row && getAccount(userId, row.id);
}
