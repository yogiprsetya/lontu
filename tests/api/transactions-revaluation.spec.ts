import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import type { Transaction } from "@/lib/schemas/transaction";
import { budgetUsage } from "@/lib/server/queries/budget-usage";
import { dashboardSummary } from "@/lib/server/queries/dashboard-summary";
import { createTestUsers, expectPgError } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const listRoute = await import("@/app/api/transactions/route");
const itemRoute = await import("@/app/api/transactions/[id]/route");
const restoreRoute = await import("@/app/api/transactions/[id]/restore/route");
const totalsRoute = await import("@/app/api/transactions/totals/route");
const exportRoute = await import("@/app/api/transactions/export/route");
const accountsRoute = await import("@/app/api/accounts/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

let userA: string;
let cleanup: () => PromiseLike<unknown>;
let gold: string;
let spending: string;

async function accountOf(accountId: string) {
  const res = await accountsRoute.GET(
    new Request("http://localhost/api/accounts?include=archived"),
    noParams,
  );
  return ((await res.json()) as { id: string; balance: number; initialBalance: number }[]).find(
    (a) => a.id === accountId,
  )!;
}

async function revaluation(amount: number, date = "2026-10-31") {
  const [row] = await db
    .insert(transactions)
    .values({ userId: userA, type: "revaluation", amount, date, accountId: gold })
    .returning();
  return row;
}

beforeAll(async () => {
  const users = await createTestUsers(1);
  [userA] = users.ids;
  cleanup = users.cleanup;
  mockedAuth.mockResolvedValue({ user: { id: userA } });
  const [account] = await db
    .insert(accounts)
    .values({
      userId: userA,
      name: `Emas ${randomUUID()}`,
      type: "asset",
      subtype: "other",
      initialBalance: 30_000_000,
    })
    .returning({ id: accounts.id });
  gold = account.id;
  const [category] = await db
    .insert(categories)
    .values({ userId: userA, name: "Makan", kind: "spending", spendingType: "needs" })
    .returning({ id: categories.id });
  spending = category.id;
});

afterAll(() => cleanup());

describe("revaluation rows in the database", () => {
  it("signed amounts move the account balance but not the effective initial balance", async () => {
    const up = await revaluation(500_000);
    const down = await revaluation(-200_000);
    expect(await accountOf(gold)).toMatchObject({
      initialBalance: 30_000_000,
      balance: 30_300_000,
    });
    await db.delete(transactions).where(inArray(transactions.id, [up.id, down.id]));
  });

  it("rejects amount 0, a category, and a target account", async () => {
    const base = { userId: userA, type: "revaluation", date: "2026-10-31", accountId: gold };
    await expectPgError(
      db.insert(transactions).values({ ...base, amount: 0 }),
      "23514",
      "transactions_amount_check",
    );
    await expectPgError(
      db.insert(transactions).values({ ...base, amount: 1, categoryId: spending }),
      "23514",
      "transactions_category_check",
    );
    const [other] = await db
      .insert(accounts)
      .values({ userId: userA, name: `Lain ${randomUUID()}`, type: "transaction" })
      .returning({ id: accounts.id });
    await expectPgError(
      db.insert(transactions).values({ ...base, amount: 1, toAccountId: other.id }),
      "23514",
      "transactions_transfer_target_check",
    );
  });
});

describe("revaluation in the transactions API", () => {
  it("cannot be created through POST /api/transactions", async () => {
    const res = await listRoute.POST(
      new Request("http://localhost/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: "revaluation",
          amount: 1_000,
          date: "2026-10-31",
          accountId: gold,
        }),
      }),
      noParams,
    );
    expect(res.status).toBe(400);
  });

  it("PATCH returns 409 TRANSACTION_NOT_EDITABLE", async () => {
    const row = await revaluation(1_000);
    const res = await itemRoute.PATCH(
      new Request(`http://localhost/api/transactions/${row.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amount: 2_000 }),
      }),
      ctx(row.id),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("TRANSACTION_NOT_EDITABLE");
    await db.delete(transactions).where(inArray(transactions.id, [row.id]));
  });

  it("DELETE shifts the balance back and restore returns it", async () => {
    const before = (await accountOf(gold)).balance;
    const row = await revaluation(700_000);
    expect((await accountOf(gold)).balance).toBe(before + 700_000);

    const deleted = await itemRoute.DELETE(
      new Request(`http://localhost/api/transactions/${row.id}`, { method: "DELETE" }),
      ctx(row.id),
    );
    expect(deleted.status).toBe(200);
    expect((await accountOf(gold)).balance).toBe(before);

    const restored = await restoreRoute.POST(
      new Request(`http://localhost/api/transactions/${row.id}/restore`, { method: "POST" }),
      ctx(row.id),
    );
    expect(restored.status).toBe(200);
    expect((await accountOf(gold)).balance).toBe(before + 700_000);
    await db.delete(transactions).where(inArray(transactions.id, [row.id]));
  });

  it("is listed with its signed amount and can be filtered by type", async () => {
    const row = await revaluation(-300_000, "2026-09-30");
    const res = await listRoute.GET(
      new Request("http://localhost/api/transactions?type=revaluation&limit=100"),
      noParams,
    );
    expect(res.status).toBe(200);
    const items = (await res.json()).items as Transaction[];
    expect(items.map((t) => t.id)).toEqual([row.id]);
    expect(items[0]).toMatchObject({ type: "revaluation", amount: -300_000, categoryId: null });
    await db.delete(transactions).where(inArray(transactions.id, [row.id]));
  });

  it("is exported as Revaluasi with a signed amount", async () => {
    const row = await revaluation(-450_000, "2026-09-29");
    const res = await exportRoute.GET(
      new Request("http://localhost/api/transactions/export?type=revaluation"),
      noParams,
    );
    const csv = await res.text();
    expect(csv).toContain("2026-09-29,Revaluasi,-450000,");
    await db.delete(transactions).where(inArray(transactions.id, [row.id]));
  });

  it("is left out of totals, dashboardSummary and budgetUsage", async () => {
    const rows = [
      await revaluation(900_000, "2026-10-20"),
      await revaluation(-100_000, "2026-10-21"),
    ];

    const totals = await totalsRoute.GET(
      new Request("http://localhost/api/transactions/totals?from=2026-10-01&to=2026-10-31"),
      noParams,
    );
    expect(await totals.json()).toEqual({ income: 0, expense: 0, saving: 0 });

    const summary = await dashboardSummary(userA, "2026-10", "2026-11-15");
    expect(summary.totals).toEqual({ income: 0, expense: 0, saving: 0, net: 0 });
    expect(summary.activity.every((b) => b.expense === 0)).toBe(true);
    expect(summary.categories).toEqual([]);

    const usage = await budgetUsage(userA, "2026-10");
    expect(usage.items).toEqual([]);
    expect(usage.unbudgeted).toEqual([]);
    await db.delete(transactions).where(
      inArray(
        transactions.id,
        rows.map((r) => r.id),
      ),
    );
  });
});
