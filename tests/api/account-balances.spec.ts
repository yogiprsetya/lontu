import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { accountBalances, accounts, categories, transactions } from "@/db/schema";
import { createTestUsers } from "../setup/db";

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;
});

afterAll(async () => {
  await cleanup();
});

describe("account_balances view", () => {
  it("applies income, expense, transfers, and ignores soft-deleted rows", async () => {
    const [a, b] = await db
      .insert(accounts)
      .values([
        { userId: userA, name: "A", type: "transaction", initialBalance: 100_000 },
        { userId: userA, name: "B", type: "transaction", initialBalance: 5_000 },
      ])
      .returning({ id: accounts.id });
    const [income, food] = await db
      .insert(categories)
      .values([
        { userId: userA, name: "Gaji", kind: "income" },
        { userId: userA, name: "Makan", kind: "spending", spendingType: "needs" },
      ])
      .returning({ id: categories.id });

    await db.insert(transactions).values([
      {
        userId: userA,
        type: "income",
        amount: 50_000,
        date: "2026-10-01",
        accountId: a.id,
        categoryId: income.id,
      },
      {
        userId: userA,
        type: "expense",
        amount: 20_000,
        date: "2026-10-02",
        accountId: a.id,
        categoryId: food.id,
      },
      {
        userId: userA,
        type: "transfer",
        amount: 10_000,
        date: "2026-10-03",
        accountId: a.id,
        toAccountId: b.id,
      },
      {
        userId: userA,
        type: "expense",
        amount: 99_000,
        date: "2026-10-04",
        accountId: a.id,
        categoryId: food.id,
        deletedAt: new Date(),
      },
    ]);

    const rows = await db
      .select({ accountId: accountBalances.accountId, balance: accountBalances.balance })
      .from(accountBalances)
      .where(inArray(accountBalances.accountId, [a.id, b.id]));
    const byId = Object.fromEntries(rows.map((r) => [r.accountId, r.balance]));

    expect(byId[a.id]).toBe(120_000);
    expect(byId[b.id]).toBe(15_000);
  });

  it("adds signed adjustments and ignores soft-deleted ones", async () => {
    const [a] = await db
      .insert(accounts)
      .values({ userId: userB, name: "Penyesuaian", type: "transaction", initialBalance: 100_000 })
      .returning({ id: accounts.id });

    await db.insert(transactions).values([
      { userId: userB, type: "adjustment", amount: 50_000, date: "2026-10-01", accountId: a.id },
      { userId: userB, type: "adjustment", amount: -30_000, date: "2026-10-02", accountId: a.id },
      {
        userId: userB,
        type: "adjustment",
        amount: -5_000,
        date: "2026-10-03",
        accountId: a.id,
        deletedAt: new Date(),
      },
    ]);

    const [row] = await db
      .select()
      .from(accountBalances)
      .where(eq(accountBalances.accountId, a.id));

    expect(row.balance).toBe(120_000);
  });

  it("returns the initial balance for an account without transactions", async () => {
    const [c] = await db
      .insert(accounts)
      .values({ userId: userB, name: "Kosong", type: "asset", initialBalance: 7_500 })
      .returning({ id: accounts.id });

    const [row] = await db
      .select()
      .from(accountBalances)
      .where(eq(accountBalances.accountId, c.id));

    expect(row).toEqual({ accountId: c.id, userId: userB, balance: 7_500 });
  });
});
