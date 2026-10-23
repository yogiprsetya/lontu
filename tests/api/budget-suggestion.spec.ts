import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, budgets, categories, transactions } from "@/db/schema";
import type { BudgetSuggestion } from "@/lib/schemas/budget";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const route = await import("@/app/api/budgets/suggestion/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

async function suggest(query: string) {
  const res = await route.GET(new Request(`http://localhost/api/budgets/suggestion${query}`), {
    params: Promise.resolve({}),
  });
  return res;
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;
let cat: Record<string, string>;
let catB: string;

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;

  const [account, accountB] = await db
    .insert(accounts)
    .values([
      { userId: userA, name: "Bank", type: "transaction" },
      { userId: userB, name: "Bank", type: "transaction" },
    ])
    .returning({ id: accounts.id });

  const rows = await db
    .insert(categories)
    .values([
      { userId: userA, name: "Makan", kind: "spending", spendingType: "needs" },
      { userId: userA, name: "Transport", kind: "spending", spendingType: "needs" },
      { userId: userA, name: "Hiburan", kind: "spending", spendingType: "wants" },
      { userId: userA, name: "Lama", kind: "spending", spendingType: "needs", archivedAt: new Date() },
      { userId: userA, name: "Gaji", kind: "income" },
      { userId: userB, name: "Makan", kind: "spending", spendingType: "needs" },
      { userId: userB, name: "Gaji", kind: "income" },
    ])
    .returning({ id: categories.id, name: categories.name, userId: categories.userId, kind: categories.kind });
  cat = Object.fromEntries(rows.filter((r) => r.userId === userA).map((r) => [r.name, r.id]));
  catB = rows.find((r) => r.userId === userB && r.kind === "spending")!.id;
  const gajiB = rows.find((r) => r.userId === userB && r.kind === "income")!.id;

  const a = { userId: userA, accountId: account.id };
  const expense = (categoryId: string, amount: number, date: string, deletedAt: Date | null = null) => ({
    ...a,
    type: "expense",
    amount,
    date,
    categoryId,
    deletedAt,
  });
  const income = (amount: number, date: string) => ({ ...a, type: "income", amount, date, categoryId: cat.Gaji });
  await db.insert(transactions).values([
    // Period 2026-10: income from September, history July–September.
    income(10_000_000, "2026-09-15"),
    income(3_000_000, "2026-08-15"),
    income(5_000_000, "2026-10-01"),
    expense(cat.Makan, 300_000, "2026-07-01"),
    expense(cat.Makan, 300_000, "2026-08-15"),
    expense(cat.Makan, 300_000, "2026-09-30"),
    expense(cat.Makan, 777_000, "2026-08-10", new Date()),
    expense(cat.Makan, 1_000_000, "2026-06-30"),
    expense(cat.Makan, 5_000_000, "2026-10-01"),
    expense(cat.Transport, 300_000, "2026-09-01"),
    expense(cat.Hiburan, 100_000, "2026-07-20"),
    expense(cat.Lama, 999_999, "2026-09-05"),
    // Period 2026-02: income from January, history November–January across the year.
    income(1_000_000, "2026-01-31"),
    expense(cat.Makan, 400, "2025-10-31"),
    expense(cat.Makan, 100, "2025-11-01"),
    expense(cat.Transport, 100, "2025-12-31"),
    expense(cat.Makan, 999_999, "2026-02-01"),
    { userId: userB, accountId: accountB.id, type: "income", amount: 99_000_000, date: "2026-09-01", categoryId: gajiB },
    { userId: userB, accountId: accountB.id, type: "expense", amount: 1_000, date: "2026-09-01", categoryId: catB },
  ]);

  await db.insert(budgets).values([
    { userId: userA, categoryId: cat.Makan, year: 2026, month: 10, amount: 1_200_000 },
    { userId: userA, categoryId: cat.Hiburan, year: 2026, month: 10, amount: 50_000, deletedAt: new Date() },
  ]);
});

afterAll(async () => {
  await cleanup();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-23T05:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/budgets/suggestion", () => {
  it("splits last month's income by the 3 full months before the period", async () => {
    signInAs(userA);
    const res = await suggest("?period=2026-10");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      period: "2026-10",
      basis: 10_000_000,
      basisSource: "previous_month",
      pools: { needs: 5_000_000, wants: 3_000_000, saving: 2_000_000 },
      items: [
        { categoryId: cat.Makan, spendingType: "needs", amount: 3_750_000, current: 1_200_000 },
        { categoryId: cat.Transport, spendingType: "needs", amount: 1_250_000, current: null },
        { categoryId: cat.Hiburan, spendingType: "wants", amount: 3_000_000, current: null },
      ],
    } satisfies BudgetSuggestion);
  });

  it("uses a typed income instead", async () => {
    signInAs(userA);
    const body = (await (await suggest("?period=2026-10&income=7777777")).json()) as BudgetSuggestion;
    expect(body).toMatchObject({
      basis: 7_777_777,
      basisSource: "input",
      pools: { needs: 3_888_000, wants: 2_333_000, saving: 1_556_777 },
    });
  });

  it("takes the window across a year boundary", async () => {
    signInAs(userA);
    const body = (await (await suggest("?period=2026-02")).json()) as BudgetSuggestion;
    expect(body.basis).toBe(1_000_000);
    expect(body.items.map((i) => [i.categoryId, i.amount])).toEqual([
      [cat.Makan, 250_000],
      [cat.Transport, 250_000],
      [cat.Hiburan, 300_000],
    ]);
  });

  it("returns no items without income last month", async () => {
    signInAs(userA);
    const body = (await (await suggest("?period=2026-08")).json()) as BudgetSuggestion;
    expect(body).toMatchObject({ basis: 0, basisSource: "previous_month", items: [] });
  });

  it("has no history or income before 2000-01", async () => {
    signInAs(userA);
    const res = await suggest("?period=2000-01&income=1000000");
    expect(res.status).toBe(200);
    const body = (await res.json()) as BudgetSuggestion;
    expect(body.items.map((i) => [i.categoryId, i.amount])).toEqual([
      [cat.Makan, 250_000],
      [cat.Transport, 250_000],
      [cat.Hiburan, 300_000],
    ]);
    expect((await (await suggest("?period=2000-01")).json()).basis).toBe(0);
  });

  it("does not write anything", async () => {
    signInAs(userA);
    const before = await db.select().from(budgets).where(inArray(budgets.userId, [userA, userB]));
    await suggest("?period=2026-11&income=5000000");
    expect(await db.select().from(budgets).where(inArray(budgets.userId, [userA, userB]))).toEqual(before);
  });

  it("never uses another user's income, spending or categories", async () => {
    signInAs(userB);
    const body = (await (await suggest("?period=2026-10")).json()) as BudgetSuggestion;
    expect(body.basis).toBe(99_000_000);
    expect(body.items.map((i) => i.categoryId)).toEqual([catB]);
    const rows = await db.select().from(budgets).where(eq(budgets.userId, userB));
    expect(rows).toEqual([]);
  });

  it.each(["", "?period=2026-13", "?period=2026-10&income=-1", "?period=2026-10&income=1.5", "?period=2026-10&income=abc"])(
    "rejects %j",
    async (query) => {
      signInAs(userA);
      const res = await suggest(query);
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    },
  );

  it("returns 401 without a session", async () => {
    signInAs(null);
    expect((await suggest("?period=2026-10")).status).toBe(401);
  });
});
