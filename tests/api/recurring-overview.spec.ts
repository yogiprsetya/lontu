import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, categories, recurringRules } from "@/db/schema";
import { paydayForecast } from "@/lib/payday-forecast";
import type { RecurringOverview } from "@/lib/schemas/recurring";
import { recurringOverview } from "@/lib/server/queries/recurring-overview";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const accountsRoute = await import("@/app/api/accounts/route");
const collection = await import("@/app/api/recurring/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);
const noParams = { params: Promise.resolve({}) };

const today = "2026-11-13";

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;

  const rows = await db
    .insert(accounts)
    .values([
      { userId: userA, name: "Debit", type: "transaction", subtype: "debit", initialBalance: 3_000_000 },
      { userId: userA, name: "E-wallet", type: "transaction", subtype: "ewallet", initialBalance: 200_000 },
      { userId: userA, name: "Kartu kredit", type: "transaction", subtype: "credit_card", initialBalance: -500_000 },
      { userId: userA, name: "Investasi", type: "asset", subtype: "investment", initialBalance: 10_000_000 },
      { userId: userA, name: "Debit lama", type: "transaction", subtype: "debit", initialBalance: 999, archivedAt: new Date() },
      { userId: userB, name: "Debit B", type: "transaction", subtype: "debit", initialBalance: 7_000_000 },
    ])
    .returning({ id: accounts.id, userId: accounts.userId });
  const accountA = rows.find((r) => r.userId === userA)!.id;
  const accountB = rows.find((r) => r.userId === userB)!.id;

  const cats = await db
    .insert(categories)
    .values([
      { userId: userA, name: "Gaji", kind: "income" },
      { userId: userA, name: "Langganan", kind: "spending", spendingType: "wants" },
      { userId: userA, name: "Dana darurat", kind: "saving" },
      { userId: userB, name: "Langganan B", kind: "spending", spendingType: "wants" },
    ])
    .returning({ id: categories.id, name: categories.name });
  const cat = (name: string) => cats.find((c) => c.name === name)!.id;

  const base = { userId: userA, accountId: accountA };
  await db.insert(recurringRules).values([
    { ...base, type: "income", name: "Gaji", amount: 10_000_000, categoryId: cat("Gaji"), dayOfMonth: 25, nextDueDate: "2026-11-25", isPayday: true },
    { ...base, type: "expense", name: "Netflix", amount: 186_000, categoryId: cat("Langganan"), dayOfMonth: 5, nextDueDate: "2026-11-05" },
    { ...base, type: "expense", name: "Sewa", amount: 2_500_000, categoryId: cat("Langganan"), dayOfMonth: 1, nextDueDate: "2026-12-01" },
    { ...base, type: "saving", name: "Setoran", amount: 1_000_000, categoryId: cat("Dana darurat"), dayOfMonth: 20, nextDueDate: "2026-11-20" },
    // User B's big bill must never reach user A's projection.
    { userId: userB, accountId: accountB, type: "expense", name: "B", amount: 9_000_000, categoryId: cat("Langganan B"), dayOfMonth: 15, nextDueDate: "2026-11-15" },
  ]);
});

afterAll(async () => {
  await db.delete(recurringRules).where(eq(recurringRules.userId, userA));
  await db.delete(recurringRules).where(eq(recurringRules.userId, userB));
  await cleanup();
});

describe("recurringOverview forecast", () => {
  it("projects the spec scenario", async () => {
    const { forecast, rules } = await recurringOverview(userA, today);
    const id = (name: string) => rules.find((r) => r.name === name)!.id;
    expect(forecast).toEqual({
      status: "ok",
      payday: "2026-11-25",
      daysLeft: 12,
      spendable: 3_200_000,
      committed: 1_186_000,
      free: 2_014_000,
      items: [
        { ruleId: id("Netflix"), dueDate: "2026-11-05", amount: 186_000 },
        { ruleId: id("Setoran"), dueDate: "2026-11-20", amount: 1_000_000 },
      ],
    });
  });

  it("matches paydayForecast over the same rules", async () => {
    const overview = await recurringOverview(userA, today);
    const spendable = overview.forecast.status === "ok" ? overview.forecast.spendable : NaN;
    expect(overview.forecast).toEqual(paydayForecast({ rules: overview.rules, spendable, today }));
  });

  it("keeps spendable equal to the matching balances from GET /api/accounts", async () => {
    mockedAuth.mockResolvedValue({ user: { id: userA } });
    const res = await accountsRoute.GET(new Request("http://localhost/api/accounts"), noParams);
    const list = (await res.json()) as { type: string; subtype: string | null; balance: number; archivedAt: string | null }[];
    const expected = list
      .filter((a) => !a.archivedAt && a.type === "transaction" && a.subtype !== "credit_card")
      .reduce((sum, a) => sum + a.balance, 0);
    const { forecast } = await recurringOverview(userA, today);
    expect(forecast.status === "ok" && forecast.spendable).toBe(expected);
  });

  it("counts a transaction account without a subtype", async () => {
    const [plain] = await db
      .insert(accounts)
      .values({ userId: userA, name: "Kas", type: "transaction", initialBalance: 50_000 })
      .returning({ id: accounts.id });
    const { forecast } = await recurringOverview(userA, today);
    await db.delete(accounts).where(eq(accounts.id, plain.id));
    expect(forecast.status === "ok" && forecast.spendable).toBe(3_250_000);
  });

  it("never mixes user A's balances or rules into user B's forecast", async () => {
    const { forecast, rules } = await recurringOverview(userB, today);
    expect(forecast).toEqual({ status: "no_payday" });
    expect(rules.map((r) => r.name)).toEqual(["B"]);
  });

  it("is served by GET /api/recurring", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-13T03:00:00Z"));
    try {
      mockedAuth.mockResolvedValue({ user: { id: userA } });
      const res = await collection.GET(new Request("http://localhost/api/recurring"), noParams);
      const body = (await res.json()) as RecurringOverview;
      expect(body.forecast).toMatchObject({ status: "ok", daysLeft: 12, spendable: 3_200_000, committed: 1_186_000 });
      expect(body.due.map((r) => r.name)).toEqual(["Netflix"]);
    } finally {
      vi.useRealTimers();
    }
  });
});
