import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import type { Transaction } from "@/lib/schemas/transaction";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const collection = await import("@/app/api/transactions/route");
const totalsRoute = await import("@/app/api/transactions/totals/route");
const { dashboardSummary } = await import("@/lib/server/queries/dashboard-summary");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };
const OCTOBER = "from=2026-10-01&to=2026-10-31";

function signInAs(userId: string) {
  mockedAuth.mockResolvedValue({ user: { id: userId } });
}

async function totals(query: string) {
  const res = await totalsRoute.GET(
    new Request(`http://localhost/api/transactions/totals?${query}`),
    noParams,
  );
  return res.json();
}

async function listed(query: string) {
  const res = await collection.GET(
    new Request(`http://localhost/api/transactions?${query}`),
    noParams,
  );
  const page = (await res.json()) as { items: Transaction[] };
  return page.items.map((t) => t.id).sort();
}

let owner: string;
let stranger: string;
let cleanup: () => PromiseLike<unknown>;
let depositId: string;
let legacyId: string;

beforeAll(async () => {
  const created = await createTestUsers(2);
  [owner, stranger] = created.ids;
  cleanup = created.cleanup;

  const [bank, wallet, gold, fund] = await db
    .insert(accounts)
    .values([
      { userId: owner, name: "bank", type: "transaction" },
      { userId: owner, name: "wallet", type: "transaction" },
      { userId: owner, name: "gold", type: "asset" },
      { userId: owner, name: "fund", type: "asset" },
    ])
    .returning();
  const [category] = await db
    .insert(categories)
    .values({ userId: owner, name: "Tabungan", kind: "saving" })
    .returning();

  const base = { userId: owner, date: "2026-10-05" };
  const transfer = (accountId: string, toAccountId: string, amount: number) => ({
    ...base,
    type: "transfer",
    accountId,
    toAccountId,
    amount,
  });
  const rows = await db
    .insert(transactions)
    .values([
      transfer(bank.id, gold.id, 1000),
      { ...base, type: "saving", accountId: bank.id, categoryId: category.id, amount: 200 },
      transfer(bank.id, wallet.id, 30),
      transfer(gold.id, fund.id, 40),
      transfer(gold.id, bank.id, 50),
      { ...transfer(bank.id, fund.id, 60), deletedAt: new Date() },
    ])
    .returning();
  [depositId, legacyId] = [rows[0].id, rows[1].id];
});

afterAll(() => cleanup());

describe("a transfer from a transaction account to an asset account is saving", () => {
  it("adds deposits to legacy saving and leaves every other transfer out", async () => {
    signInAs(owner);
    expect(await totals(OCTOBER)).toEqual({ income: 0, expense: 0, saving: 1200 });
  });

  it("lists the same rows under the saving filter", async () => {
    signInAs(owner);
    expect(await listed(`type=saving&${OCTOBER}`)).toEqual([depositId, legacyId].sort());
  });

  it("subtracts deposits from the dashboard's net", async () => {
    const { totals: summary } = await dashboardSummary(owner, "2026-10", "2026-10-31");
    expect(summary).toMatchObject({ saving: 1200, net: -1200 });
  });

  it("does not leak into another user's totals", async () => {
    signInAs(stranger);
    expect(await totals(OCTOBER)).toEqual({ income: 0, expense: 0, saving: 0 });
    expect(await listed(`type=saving&${OCTOBER}`)).toEqual([]);
  });
});
