import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { accounts, budgets, categories, transactions } from "@/db/schema";
import { createTestUsers, expectPgError } from "../setup/db";

const CHECK_VIOLATION = "23514";
const UNIQUE_VIOLATION = "23505";

let userId: string;
let cleanup: () => PromiseLike<unknown>;
let accountA: string;
let accountB: string;
let spending: string;

beforeAll(async () => {
  const created = await createTestUsers(1);
  [userId] = created.ids;
  cleanup = created.cleanup;

  const [a, b] = await db
    .insert(accounts)
    .values([
      { userId, name: "BCA", type: "transaction" },
      { userId, name: "Dana", type: "transaction" },
    ])
    .returning({ id: accounts.id });
  accountA = a.id;
  accountB = b.id;

  const [c] = await db
    .insert(categories)
    .values({ userId, name: "Makan", kind: "spending", spendingType: "needs" })
    .returning({ id: categories.id });
  spending = c.id;
});

afterAll(async () => {
  await cleanup();
});

describe("transactions constraints", () => {
  it("accepts a valid expense and a valid transfer", async () => {
    const rows = await db
      .insert(transactions)
      .values([
        { userId, type: "expense", amount: 1000, date: "2026-10-20", accountId: accountA, categoryId: spending },
        { userId, type: "transfer", amount: 1000, date: "2026-10-20", accountId: accountA, toAccountId: accountB },
      ])
      .returning({ id: transactions.id });
    expect(rows).toHaveLength(2);
  });

  it("rejects a transfer without to_account_id", async () => {
    await expectPgError(
      db.insert(transactions).values({ userId, type: "transfer", amount: 1000, date: "2026-10-20", accountId: accountA }),
      CHECK_VIOLATION,
      "transactions_transfer_target_check",
    );
  });

  it("rejects a transfer to the same account", async () => {
    await expectPgError(
      db.insert(transactions).values({
        userId,
        type: "transfer",
        amount: 1000,
        date: "2026-10-20",
        accountId: accountA,
        toAccountId: accountA,
      }),
      CHECK_VIOLATION,
      "transactions_distinct_accounts_check",
    );
  });

  it("rejects an expense without a category", async () => {
    await expectPgError(
      db.insert(transactions).values({ userId, type: "expense", amount: 1000, date: "2026-10-20", accountId: accountA }),
      CHECK_VIOLATION,
      "transactions_category_check",
    );
  });

  it("rejects a transfer that carries a category", async () => {
    await expectPgError(
      db.insert(transactions).values({
        userId,
        type: "transfer",
        amount: 1000,
        date: "2026-10-20",
        accountId: accountA,
        toAccountId: accountB,
        categoryId: spending,
      }),
      CHECK_VIOLATION,
      "transactions_category_check",
    );
  });

  it.each([0, -500])("rejects amount %i", async (amount) => {
    await expectPgError(
      db.insert(transactions).values({ userId, type: "expense", amount, date: "2026-10-20", accountId: accountA, categoryId: spending }),
      CHECK_VIOLATION,
      "transactions_amount_check",
    );
  });

  it("rejects an unknown type", async () => {
    await expectPgError(
      db.insert(transactions).values({ userId, type: "refund", amount: 1000, date: "2026-10-20", accountId: accountA, categoryId: spending }),
      CHECK_VIOLATION,
      "transactions_type_check",
    );
  });
});

describe("categories constraints", () => {
  it("rejects a spending category without spending_type", async () => {
    await expectPgError(
      db.insert(categories).values({ userId, name: "Hiburan", kind: "spending" }),
      CHECK_VIOLATION,
      "categories_spending_type_check",
    );
  });

  it("rejects spending_type on an income category", async () => {
    await expectPgError(
      db.insert(categories).values({ userId, name: "Gaji", kind: "income", spendingType: "wants" }),
      CHECK_VIOLATION,
      "categories_spending_type_check",
    );
  });

  it("rejects a duplicate name within the same kind, case-insensitively", async () => {
    await expectPgError(
      db.insert(categories).values({ userId, name: "MAKAN", kind: "spending", spendingType: "wants" }),
      UNIQUE_VIOLATION,
      "categories_user_kind_name_unique",
    );
  });

  it("allows the same name under a different kind", async () => {
    const rows = await db.insert(categories).values({ userId, name: "Makan", kind: "income" }).returning();
    expect(rows).toHaveLength(1);
  });
});

describe("accounts constraints", () => {
  it("rejects a duplicate account name case-insensitively", async () => {
    await expectPgError(
      db.insert(accounts).values({ userId, name: "bca", type: "asset" }),
      UNIQUE_VIOLATION,
      "accounts_user_name_unique",
    );
  });

  it("rejects an unknown account type", async () => {
    await expectPgError(
      db.insert(accounts).values({ userId, name: "Kas", type: "cash" }),
      CHECK_VIOLATION,
      "accounts_type_check",
    );
  });
});

describe("budgets constraints", () => {
  it.each([0, 13])("rejects month %i", async (month) => {
    await expectPgError(
      db.insert(budgets).values({ userId, categoryId: spending, year: 2026, month, amount: 1000 }),
      CHECK_VIOLATION,
      "budgets_month_check",
    );
  });

  it("rejects a negative amount", async () => {
    await expectPgError(
      db.insert(budgets).values({ userId, categoryId: spending, year: 2026, month: 10, amount: -1 }),
      CHECK_VIOLATION,
      "budgets_amount_check",
    );
  });

  it("rejects a second budget for the same category and month", async () => {
    await db.insert(budgets).values({ userId, categoryId: spending, year: 2026, month: 11, amount: 1000 });
    await expectPgError(
      db.insert(budgets).values({ userId, categoryId: spending, year: 2026, month: 11, amount: 2000 }),
      UNIQUE_VIOLATION,
      "budgets_user_category_period_unique",
    );
  });
});
