import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, budgets, categories, transactions } from "@/db/schema";
import type { BudgetUsage } from "@/lib/schemas/budget";
import { budgetUsage } from "@/lib/server/queries/budget-usage";
import { transactionTotals } from "@/lib/server/queries/transaction-totals";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const route = await import("@/app/api/budgets/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function get(query = "") {
  return route.GET(new Request(`http://localhost/api/budgets${query}`), noParams);
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;
let cat: Record<string, string>;
let catB: string;
let makanBudget: string;

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;

  const [account, toAccount, accountB] = await db
    .insert(accounts)
    .values([
      { userId: userA, name: "Bank", type: "transaction" },
      { userId: userA, name: "Dompet", type: "transaction" },
      { userId: userB, name: "Bank", type: "transaction" },
    ])
    .returning({ id: accounts.id });

  const archivedAt = new Date();
  const rows = await db
    .insert(categories)
    .values([
      { userId: userA, name: "Makan", kind: "spending", spendingType: "needs" },
      { userId: userA, name: "Hiburan", kind: "spending", spendingType: "wants" },
      { userId: userA, name: "Jajan", kind: "spending", spendingType: "wants" },
      { userId: userA, name: "Listrik", kind: "spending", spendingType: "needs", archivedAt },
      { userId: userA, name: "kos", kind: "spending", spendingType: "needs", archivedAt },
      { userId: userA, name: "Lama", kind: "spending", spendingType: "needs", archivedAt },
      { userId: userA, name: "Gaji", kind: "income" },
      { userId: userA, name: "Tabungan", kind: "saving" },
      { userId: userB, name: "Makan", kind: "spending", spendingType: "needs" },
    ])
    .returning({ id: categories.id, name: categories.name, userId: categories.userId });
  cat = Object.fromEntries(rows.filter((r) => r.userId === userA).map((r) => [r.name, r.id]));
  catB = rows.find((r) => r.userId === userB)!.id;

  const a = { userId: userA, accountId: account.id };
  await db.insert(transactions).values([
    { ...a, type: "expense", amount: 1_000_000, date: "2026-10-01", categoryId: cat.Makan },
    { ...a, type: "expense", amount: 250_000, date: "2026-10-31", categoryId: cat.Makan },
    {
      ...a,
      type: "expense",
      amount: 50_000,
      date: "2026-10-15",
      categoryId: cat.Makan,
      description: "Biaya admin transfer",
    },
    {
      ...a,
      type: "expense",
      amount: 999,
      date: "2026-10-10",
      categoryId: cat.Makan,
      deletedAt: new Date(),
    },
    { ...a, type: "expense", amount: 777, date: "2026-09-30", categoryId: cat.Makan },
    { ...a, type: "expense", amount: 888, date: "2026-11-01", categoryId: cat.Makan },
    { ...a, type: "expense", amount: 200_000, date: "2026-10-05", categoryId: cat.Hiburan },
    { ...a, type: "expense", amount: 100_000, date: "2026-10-06", categoryId: cat.Listrik },
    { ...a, type: "expense", amount: 5_000, date: "2024-02-29", categoryId: cat.Makan },
    { ...a, type: "income", amount: 10_000_000, date: "2026-10-01", categoryId: cat.Gaji },
    { ...a, type: "saving", amount: 400_000, date: "2026-10-02", categoryId: cat.Tabungan },
    { ...a, type: "transfer", amount: 300_000, date: "2026-10-03", toAccountId: toAccount.id },
    { ...a, type: "adjustment", amount: -123, date: "2026-10-04" },
    {
      userId: userB,
      accountId: accountB.id,
      type: "expense",
      amount: 42_000,
      date: "2026-10-07",
      categoryId: catB,
    },
  ]);

  const budgetRows = await db
    .insert(budgets)
    .values([
      { userId: userA, categoryId: cat.Makan, year: 2026, month: 10, amount: 1_500_000 },
      { userId: userA, categoryId: cat.kos, year: 2026, month: 10, amount: 500_000 },
      {
        userId: userA,
        categoryId: cat.Jajan,
        year: 2026,
        month: 10,
        amount: 100_000,
        deletedAt: new Date(),
      },
      { userId: userA, categoryId: cat.Hiburan, year: 2026, month: 9, amount: 300_000 },
      { userId: userB, categoryId: catB, year: 2026, month: 10, amount: 50_000 },
    ])
    .returning({ id: budgets.id, categoryId: budgets.categoryId, month: budgets.month });
  makanBudget = budgetRows.find((r) => r.categoryId === cat.Makan)!.id;
});

afterAll(async () => {
  await cleanup();
});

describe("budgetUsage", () => {
  let usage: BudgetUsage;

  beforeAll(async () => {
    usage = await budgetUsage(userA, "2026-10");
  });

  it("counts only non-deleted expenses inside the month, transfer fees included", () => {
    expect(usage.items.find((i) => i.categoryId === cat.Makan)).toEqual({
      categoryId: cat.Makan,
      spendingType: "needs",
      budgetId: makanBudget,
      budget: 1_500_000,
      spent: 1_300_000,
      remaining: 200_000,
      percent: 86,
      status: "warning",
    });
  });

  it("lists active spending categories plus archived ones with a budget or spending, needs first then by name", () => {
    expect(usage.items.map((i) => i.categoryId)).toEqual([
      cat.kos,
      cat.Listrik,
      cat.Makan,
      cat.Hiburan,
      cat.Jajan,
    ]);
  });

  it("shows a category without an active budget as none, ignoring soft-deleted and other months' budgets", () => {
    const byId = Object.fromEntries(usage.items.map((i) => [i.categoryId, i]));
    expect(byId[cat.Jajan]).toMatchObject({
      budgetId: null,
      budget: null,
      spent: 0,
      status: "none",
    });
    expect(byId[cat.Hiburan]).toMatchObject({
      budget: null,
      spent: 200_000,
      remaining: null,
      status: "none",
    });
    expect(byId[cat.Listrik]).toMatchObject({ budget: null, spent: 100_000, status: "none" });
    expect(byId[cat.kos]).toMatchObject({ budget: 500_000, spent: 0, percent: 0, status: "ok" });
  });

  it("summarises needs, wants and total", () => {
    expect(usage.period).toBe("2026-10");
    expect(usage.summary).toEqual({
      needs: { budget: 2_000_000, spent: 1_400_000, unbudgetedSpent: 100_000 },
      wants: { budget: 0, spent: 200_000, unbudgetedSpent: 200_000 },
      total: { budget: 2_000_000, spent: 1_600_000, unbudgetedSpent: 300_000 },
    });
  });

  it("matches transactionTotals expense for the same month", async () => {
    const totals = await transactionTotals(userA, { from: "2026-10-01", to: "2026-10-31" });
    expect(usage.summary.total.spent).toBe(totals.expense);
  });

  it("includes 29 February in a leap month", async () => {
    const feb = await budgetUsage(userA, "2024-02");
    expect(feb.items.find((i) => i.categoryId === cat.Makan)?.spent).toBe(5_000);
    expect(feb.summary.total.spent).toBe(5_000);
  });

  it("returns only active categories with zero spending for an empty month", async () => {
    const empty = await budgetUsage(userA, "2025-01");
    expect(empty.items.map((i) => i.categoryId)).toEqual([cat.Makan, cat.Hiburan, cat.Jajan]);
    expect(empty.summary.total).toEqual({ budget: 0, spent: 0, unbudgetedSpent: 0 });
  });
});

describe("GET /api/budgets", () => {
  it("returns the signed-in user's usage", async () => {
    signInAs(userA);
    const res = await get("?period=2026-10");
    expect(res.status).toBe(200);
    const body = (await res.json()) as BudgetUsage;
    expect(body.summary.total.spent).toBe(1_600_000);
  });

  it("never shows user A's categories, budgets or spending to user B", async () => {
    signInAs(userB);
    const body = (await (await get("?period=2026-10")).json()) as BudgetUsage;
    expect(body.items).toEqual([
      {
        categoryId: catB,
        spendingType: "needs",
        budgetId: expect.any(String),
        budget: 50_000,
        spent: 42_000,
        remaining: 8_000,
        percent: 84,
        status: "warning",
      },
    ]);
    expect(body.summary.total).toEqual({ budget: 50_000, spent: 42_000, unbudgetedSpent: 0 });
  });

  it.each(["", "?period=2026-13", "?period=1999-12", "?period=2026-1"])(
    "rejects %j under fields.period",
    async (query) => {
      signInAs(userA);
      const res = await get(query);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.fields.period).toBeDefined();
    },
  );

  it("returns 401 without a session", async () => {
    signInAs(null);
    const res = await get("?period=2026-10");
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });
});
