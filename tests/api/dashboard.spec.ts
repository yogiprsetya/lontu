import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import type { DashboardSummary } from "@/lib/schemas/dashboard";
import { budgetUsage } from "@/lib/server/queries/budget-usage";
import { dashboardSummary } from "@/lib/server/queries/dashboard-summary";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const route = await import("@/app/api/dashboard/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function get(query = "") {
  return route.GET(new Request(`http://localhost/api/dashboard${query}`), noParams);
}

const zero = { income: 0, expense: 0, saving: 0, net: 0 };

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;
let cat: Record<string, string>;

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;

  const [account, toAccount] = await db
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
      {
        userId: userA,
        name: "Listrik",
        kind: "spending",
        spendingType: "needs",
        archivedAt: new Date(),
      },
      { userId: userA, name: "Hiburan", kind: "spending", spendingType: "wants" },
      { userId: userA, name: "Gaji", kind: "income" },
      { userId: userA, name: "Tabungan", kind: "saving" },
    ])
    .returning({ id: categories.id, name: categories.name });
  cat = Object.fromEntries(rows.map((r) => [r.name, r.id]));

  const a = { userId: userA, accountId: account.id };
  await db.insert(transactions).values([
    { ...a, type: "income", amount: 10_000_000, date: "2026-10-01", categoryId: cat.Gaji },
    { ...a, type: "expense", amount: 2_000_000, date: "2026-10-01", categoryId: cat.Makan },
    {
      ...a,
      type: "expense",
      amount: 50_000,
      date: "2026-10-25",
      categoryId: cat.Makan,
      description: "Biaya admin transfer",
    },
    { ...a, type: "expense", amount: 950_000, date: "2026-10-10", categoryId: cat.Listrik },
    {
      ...a,
      type: "expense",
      amount: 999,
      date: "2026-10-11",
      categoryId: cat.Makan,
      deletedAt: new Date(),
    },
    { ...a, type: "saving", amount: 1_000_000, date: "2026-10-02", categoryId: cat.Tabungan },
    { ...a, type: "transfer", amount: 300_000, date: "2026-10-03", toAccountId: toAccount.id },
    { ...a, type: "adjustment", amount: -123, date: "2026-10-04" },
    { ...a, type: "income", amount: 8_000_000, date: "2026-09-05", categoryId: cat.Gaji },
    { ...a, type: "expense", amount: 400_000, date: "2026-09-25", categoryId: cat.Makan },
    { ...a, type: "expense", amount: 600_000, date: "2026-09-26", categoryId: cat.Makan },
    { ...a, type: "expense", amount: 100_000, date: "2028-02-01", categoryId: cat.Makan },
    { ...a, type: "expense", amount: 200_000, date: "2028-02-29", categoryId: cat.Makan },
  ]);
});

afterAll(async () => {
  await cleanup();
});

describe("dashboardSummary", () => {
  it("totals the current month to date, leaving out transfers, adjustments and deleted rows", async () => {
    const { activity, categories, ...summary } = await dashboardSummary(
      userA,
      "2026-10",
      "2026-10-25",
    );
    expect(categories).toHaveLength(2);
    expect(activity).toHaveLength(25);
    expect(summary).toEqual({
      period: "2026-10",
      range: { from: "2026-10-01", to: "2026-10-25" },
      previous: { period: "2026-09", range: { from: "2026-09-01", to: "2026-09-25" } },
      totals: { income: 10_000_000, expense: 3_000_000, saving: 1_000_000, net: 6_000_000 },
      previousTotals: { income: 8_000_000, expense: 400_000, saving: 0, net: 7_600_000 },
    } satisfies Omit<DashboardSummary, "activity" | "categories">);
  });

  it("compares a past month with the full month before it", async () => {
    const summary = await dashboardSummary(userA, "2026-10", "2026-11-15");
    expect(summary.range).toEqual({ from: "2026-10-01", to: "2026-10-31" });
    expect(summary.previousTotals.expense).toBe(1_000_000);
  });

  it("matches the budget page's spending for the same month", async () => {
    const summary = await dashboardSummary(userA, "2026-10", "2026-11-15");
    const usage = await budgetUsage(userA, "2026-10");
    expect(summary.totals.expense).toBe(usage.summary.total.spent);
  });

  it("returns zeros for an empty period and for the 1999 comparison of January 2000", async () => {
    const empty = await dashboardSummary(userA, "2026-07", "2026-10-25");
    expect(empty.totals).toEqual(zero);
    expect(empty.activity).toHaveLength(31);
    expect(empty.activity.every((b) => b.expense === 0)).toBe(true);
    expect(empty.categories).toEqual([]);
    expect(empty.previousTotals).toEqual(zero);
    const first = await dashboardSummary(userA, "2000-01", "2026-10-25");
    expect(first.previousTotals).toEqual(zero);
  });

  it("never counts another user's transactions", async () => {
    const summary = await dashboardSummary(userB, "2026-10", "2026-10-25");
    expect(summary.totals).toEqual(zero);
    expect(summary.activity).toHaveLength(25);
    expect(summary.activity.every((b) => b.expense === 0)).toBe(true);
    expect(summary.previousTotals).toEqual(zero);
    expect(summary.categories).toEqual([]);
  });
});

describe("dashboardSummary categories", () => {
  it("lists every category with spending, archived ones included, largest first", async () => {
    const { categories, totals } = await dashboardSummary(userA, "2026-10", "2026-10-25");
    expect(categories).toEqual([
      { categoryId: cat.Makan, spendingType: "needs", amount: 2_050_000 },
      { categoryId: cat.Listrik, spendingType: "needs", amount: 950_000 },
    ]);
    expect(categories.reduce((sum, c) => sum + c.amount, 0)).toBe(totals.expense);
  });

  it("stays inside the range", async () => {
    const { categories } = await dashboardSummary(userA, "2026-09", "2026-10-25");
    expect(categories).toEqual([
      { categoryId: cat.Makan, spendingType: "needs", amount: 1_000_000 },
    ]);
  });
});

describe("dashboardSummary activity", () => {
  const byBucket = (activity: DashboardSummary["activity"]) =>
    Object.fromEntries(activity.map((b) => [b.bucket, b.expense]));

  it("has one bucket per day up to today, empty days at 0, only expenses", async () => {
    const { activity, totals } = await dashboardSummary(userA, "2026-10", "2026-10-25");
    expect(activity.map((b) => b.bucket)).toEqual(
      Array.from({ length: 25 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`),
    );
    expect(byBucket(activity)).toMatchObject({
      "2026-10-01": 2_000_000,
      "2026-10-10": 950_000,
      "2026-10-25": 50_000,
      "2026-10-02": 0,
    });
    expect(activity.reduce((sum, b) => sum + b.expense, 0)).toBe(totals.expense);
  });

  it("covers a whole past month, the first and the last day included", async () => {
    const september = await dashboardSummary(userA, "2026-09", "2026-10-25");
    expect(september.activity).toHaveLength(30);
    expect(byBucket(september.activity)).toMatchObject({
      "2026-09-25": 400_000,
      "2026-09-26": 600_000,
      "2026-09-30": 0,
    });

    const february = await dashboardSummary(userA, "2028-02", "2028-03-10");
    expect(february.activity).toHaveLength(29);
    expect(february.activity[0]).toEqual({ bucket: "2028-02-01", expense: 100_000 });
    expect(february.activity[28]).toEqual({ bucket: "2028-02-29", expense: 200_000 });
  });

  it("has one bucket per month in year mode, stopping at the current month", async () => {
    const { activity, totals } = await dashboardSummary(userA, "2026", "2026-10-25");
    expect(activity.map((b) => b.bucket)).toEqual(
      Array.from({ length: 10 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`),
    );
    expect(byBucket(activity)).toMatchObject({
      "2026-08": 0,
      "2026-09": 1_000_000,
      "2026-10": 3_000_000,
    });
    expect(activity.reduce((sum, b) => sum + b.expense, 0)).toBe(totals.expense);

    const leap = await dashboardSummary(userA, "2028", "2028-02-29");
    expect(leap.activity).toEqual([
      { bucket: "2028-01", expense: 0 },
      { bucket: "2028-02", expense: 300_000 },
    ]);
  });
});

describe("GET /api/dashboard", () => {
  it("returns the summary for the session user", async () => {
    signInAs(userA);
    const res = await get("?period=2026-09");
    expect(res.status).toBe(200);
    const body = (await res.json()) as DashboardSummary;
    expect(body.range).toEqual({ from: "2026-09-01", to: "2026-09-30" });
    expect(body.totals).toEqual({
      income: 8_000_000,
      expense: 1_000_000,
      saving: 0,
      net: 7_000_000,
    });
  });

  it.each([
    "",
    "?period=",
    "?period=2026-13",
    "?period=26-10",
    "?period=1999",
    "?period=1999-12",
    "?period=2999-01",
    "?period=2999",
  ])("rejects %j under fields.period", async (query) => {
    signInAs(userA);
    const res = await get(query);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fields.period).toBeDefined();
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    const res = await get("?period=2026-10");
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });
});
