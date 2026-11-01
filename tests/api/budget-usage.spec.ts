import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, budgetVersions, categories, transactions } from "@/db/schema";
import type { BudgetUsage } from "@/lib/schemas/budget-usage";
import { budgetUsage } from "@/lib/server/queries/budget-usage";
import { transactionTotals } from "@/lib/server/queries/transaction-totals";
import { monthRange } from "@/lib/period";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const route = await import("@/app/api/budgets/usage/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function get(query = "") {
  return route.GET(new Request(`http://localhost/api/budgets/usage${query}`), noParams);
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;
let cat: Record<string, string>;
let catB: string;
// Makan: Sep {Makan} 1.000.000 → Nov {Makan, Kesehatan} 1.200.000 → ended in Dec.
const makan = randomUUID();
// Jajan & Hiburan: first version in Nov.
const jajan = randomUUID();
// Lama: Oct {Lama}, the category archived since.
const lama = randomUUID();
// Kabisat: Feb 2024 {Jajan}, ended in Mar 2024.
const kabisat = randomUUID();
const budgetB = randomUUID();

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

  const rows = await db
    .insert(categories)
    .values([
      { userId: userA, name: "Makan", kind: "spending", spendingType: "needs" },
      { userId: userA, name: "kesehatan", kind: "spending", spendingType: "needs" },
      {
        userId: userA,
        name: "Lama",
        kind: "spending",
        spendingType: "needs",
        archivedAt: new Date(),
      },
      { userId: userA, name: "Jajan", kind: "spending", spendingType: "wants" },
      { userId: userA, name: "Hiburan", kind: "spending", spendingType: "wants" },
      { userId: userA, name: "Gaji", kind: "income" },
      { userId: userA, name: "Tabungan", kind: "saving" },
      { userId: userB, name: "Makan", kind: "spending", spendingType: "needs" },
    ])
    .returning({ id: categories.id, name: categories.name, userId: categories.userId });
  cat = Object.fromEntries(rows.filter((r) => r.userId === userA).map((r) => [r.name, r.id]));
  catB = rows.find((r) => r.userId === userB)!.id;

  const a = { userId: userA, accountId: account.id };
  const expense = (amount: number, date: string, categoryId: string) => ({
    ...a,
    type: "expense",
    amount,
    date,
    categoryId,
  });
  await db.insert(transactions).values([
    expense(777, "2026-09-30", cat.Makan),
    expense(1_000_000, "2026-10-01", cat.Makan),
    expense(250_000, "2026-10-31", cat.Makan),
    { ...expense(999, "2026-10-10", cat.Makan), deletedAt: new Date() },
    expense(100_000, "2026-10-15", cat.kesehatan),
    expense(50_000, "2026-10-05", cat.Jajan),
    expense(30_000, "2026-10-06", cat.Lama),
    { ...a, type: "income", amount: 10_000_000, date: "2026-10-01", categoryId: cat.Gaji },
    { ...a, type: "saving", amount: 400_000, date: "2026-10-02", categoryId: cat.Tabungan },
    { ...a, type: "transfer", amount: 300_000, date: "2026-10-03", toAccountId: toAccount.id },
    { ...a, type: "adjustment", amount: -123, date: "2026-10-04" },
    expense(400_000, "2026-11-01", cat.Makan),
    expense(200_000, "2026-11-30", cat.kesehatan),
    expense(700_000, "2026-11-10", cat.Jajan),
    expense(5_000, "2026-12-03", cat.Makan),
    expense(5_000, "2024-02-29", cat.Jajan),
    {
      userId: userB,
      accountId: accountB.id,
      type: "expense",
      amount: 42_000,
      date: "2026-10-07",
      categoryId: catB,
    },
  ]);

  const v = (
    budgetId: string,
    name: string,
    spendingType: "needs" | "wants",
    period: string,
    amount: number,
    categoryIds: string[],
    ended = false,
  ) => ({
    userId: userA,
    budgetId,
    name,
    spendingType,
    year: Number(period.slice(0, 4)),
    month: Number(period.slice(5)),
    amount,
    categoryIds,
    deletedAt: ended ? new Date() : null,
  });
  await db
    .insert(budgetVersions)
    .values([
      v(makan, "Makan", "needs", "2026-09", 1_000_000, [cat.Makan]),
      v(makan, "Makan & Sehat", "needs", "2026-11", 1_200_000, [cat.Makan, cat.kesehatan]),
      v(makan, "Makan & Sehat", "needs", "2026-12", 1_200_000, [cat.Makan, cat.kesehatan], true),
      v(jajan, "Jajan & Hiburan", "wants", "2026-11", 800_000, [cat.Jajan, cat.Hiburan]),
      v(lama, "Lama", "needs", "2026-10", 100_000, [cat.Lama]),
      v(kabisat, "Kabisat", "wants", "2024-02", 10_000, [cat.Jajan]),
      v(kabisat, "Kabisat", "wants", "2024-03", 10_000, [cat.Jajan], true),
      { ...v(budgetB, "Makan B", "needs", "2026-10", 50_000, [catB]), userId: userB },
    ]);
});

afterAll(async () => {
  await cleanup();
});

describe("budgetUsage", () => {
  it("uses the September version in October, counting only that month's non-deleted expenses", async () => {
    const usage = await budgetUsage(userA, "2026-10");
    expect(usage.period).toBe("2026-10");
    expect(usage.items).toEqual([
      {
        budgetId: lama,
        name: "Lama",
        spendingType: "needs",
        budget: 100_000,
        spent: 30_000,
        remaining: 70_000,
        percent: 30,
        status: "ok",
        categories: [{ categoryId: cat.Lama, spent: 30_000 }],
      },
      {
        budgetId: makan,
        name: "Makan",
        spendingType: "needs",
        budget: 1_000_000,
        spent: 1_250_000,
        remaining: -250_000,
        percent: 125,
        status: "over",
        categories: [{ categoryId: cat.Makan, spent: 1_250_000 }],
      },
    ]);
  });

  it("lists spending outside every shown budget as unbudgeted, needs first then by name", async () => {
    const usage = await budgetUsage(userA, "2026-10");
    expect(usage.unbudgeted).toEqual([
      { categoryId: cat.kesehatan, spendingType: "needs", spent: 100_000 },
      { categoryId: cat.Jajan, spendingType: "wants", spent: 50_000 },
    ]);
    expect(usage.summary).toEqual({
      total: { budget: 1_100_000, spent: 1_430_000, unbudgetedSpent: 150_000 },
    });
  });

  it("uses the November version in November, with a budget created that month and its categories by name", async () => {
    const usage = await budgetUsage(userA, "2026-11");
    expect(usage.items.map((i) => [i.name, i.budget, i.spent, i.status])).toEqual([
      ["Lama", 100_000, 0, "ok"],
      ["Makan & Sehat", 1_200_000, 600_000, "ok"],
      ["Jajan & Hiburan", 800_000, 700_000, "warning"],
    ]);
    expect(usage.items[1].categories).toEqual([
      { categoryId: cat.kesehatan, spent: 200_000 },
      { categoryId: cat.Makan, spent: 400_000 },
    ]);
    expect(usage.items[2].categories).toEqual([
      { categoryId: cat.Hiburan, spent: 0 },
      { categoryId: cat.Jajan, spent: 700_000 },
    ]);
    expect(usage.unbudgeted).toEqual([]);
  });

  it("hides a budget from the month it ended, keeping earlier months", async () => {
    const dec = await budgetUsage(userA, "2026-12");
    expect(dec.items.map((i) => i.budgetId)).toEqual([lama, jajan]);
    expect(dec.unbudgeted).toEqual([
      { categoryId: cat.Makan, spendingType: "needs", spent: 5_000 },
    ]);
    const jan = await budgetUsage(userA, "2027-01");
    expect(jan.items.map((i) => i.budgetId)).toEqual([lama, jajan]);
  });

  it("shows no budget before its first version", async () => {
    const aug = await budgetUsage(userA, "2026-08");
    expect(aug.items).toEqual([]);
    const oct = await budgetUsage(userA, "2026-10");
    expect(oct.items.map((i) => i.budgetId)).not.toContain(jajan);
  });

  it("includes 29 February in a leap month", async () => {
    const feb = await budgetUsage(userA, "2024-02");
    expect(feb.items).toMatchObject([{ budgetId: kabisat, spent: 5_000 }]);
    expect(feb.summary.total.spent).toBe(5_000);
    expect((await budgetUsage(userA, "2024-03")).items).toEqual([]);
  });

  it.each(["2026-09", "2026-10", "2026-11", "2026-12", "2024-02"])(
    "matches transactionTotals expense in %s, also when a category moves into a budget",
    async (period) => {
      const usage = await budgetUsage(userA, period);
      const totals = await transactionTotals(userA, monthRange(period));
      expect(usage.summary.total.spent).toBe(totals.expense);
    },
  );
});

describe("GET /api/budgets/usage", () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-15T05:00:00Z"));
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  afterEach(() => {
    mockedAuth.mockReset();
  });

  it("returns the signed-in user's usage up to the current month", async () => {
    signInAs(userA);
    const res = await get("?period=2026-12");
    expect(res.status).toBe(200);
    const body = (await res.json()) as BudgetUsage;
    expect(body.items.map((i) => i.budgetId)).toEqual([lama, jajan]);
  });

  it("never shows user A's budgets, categories or spending to user B", async () => {
    signInAs(userB);
    const body = (await (await get("?period=2026-10")).json()) as BudgetUsage;
    expect(body.items).toEqual([
      {
        budgetId: budgetB,
        name: "Makan B",
        spendingType: "needs",
        budget: 50_000,
        spent: 42_000,
        remaining: 8_000,
        percent: 84,
        status: "warning",
        categories: [{ categoryId: catB, spent: 42_000 }],
      },
    ]);
    expect(body.unbudgeted).toEqual([]);
    expect(body.summary.total).toEqual({ budget: 50_000, spent: 42_000, unbudgetedSpent: 0 });
  });

  it.each(["", "?period=2026-13", "?period=1999-12", "?period=2027-01", "?period=26-10"])(
    "rejects %j with fields.period",
    async (query) => {
      signInAs(userA);
      const res = await get(query);
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string; fields: object } };
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.fields).toHaveProperty("period");
    },
  );

  it("returns 401 without a session", async () => {
    signInAs(null);
    const res = await get("?period=2026-10");
    expect(res.status).toBe(401);
  });
});
