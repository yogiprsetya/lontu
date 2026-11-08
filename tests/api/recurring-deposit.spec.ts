import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import type { AdvanceResult, RecurringRule } from "@/lib/schemas/recurring";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const collection = await import("@/app/api/recurring/route");
const advanceRoute = await import("@/app/api/recurring/[id]/advance/route");
const item = await import("@/app/api/recurring/[id]/route");
const accountsRoute = await import("@/app/api/accounts/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };

function signInAs(userId: string) {
  mockedAuth.mockResolvedValue({ user: { id: userId } });
}

function create(body: unknown) {
  return collection.POST(
    new Request("http://localhost/api/recurring", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    noParams,
  );
}

function advance(id: string, body: unknown) {
  return advanceRoute.POST(
    new Request(`http://localhost/api/recurring/${id}/advance`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

function patch(id: string, body: unknown) {
  return item.PATCH(
    new Request(`http://localhost/api/recurring/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id }) },
  );
}

async function balanceOf(id: string) {
  const res = await accountsRoute.GET(new Request("http://localhost/api/accounts"), noParams);
  const list = (await res.json()) as { id: string; balance: number }[];
  return list.find((a) => a.id === id)?.balance;
}

async function fieldError(res: Response) {
  expect(res.status).toBe(400);
  const { error } = (await res.json()) as { error: { fields?: Record<string, string[]> } };
  return Object.keys(error.fields ?? {});
}

let owner: string;
let stranger: string;
let cleanup: () => PromiseLike<unknown>;
let bank: string;
let wallet: string;
let gold: string;
let fund: string;
let foreignGold: string;
let spending: string;

const deposit = (overrides: Record<string, unknown> = {}) => ({
  type: "transfer",
  name: "Dana darurat",
  amount: 500_000,
  accountId: bank,
  toAccountId: gold,
  dayOfMonth: 5,
  ...overrides,
});

const expense = (overrides: Record<string, unknown> = {}) => ({
  type: "expense",
  name: "Netflix",
  amount: 1,
  accountId: bank,
  categoryId: spending,
  dayOfMonth: 5,
  ...overrides,
});

async function createdRule(body: unknown) {
  const res = await create(body);
  return (await res.json()) as RecurringRule;
}

beforeAll(async () => {
  const created = await createTestUsers(2);
  [owner, stranger] = created.ids;
  cleanup = created.cleanup;
  const rows = await db
    .insert(accounts)
    .values([
      { userId: owner, name: "bank", type: "transaction", initialBalance: 1_000_000 },
      { userId: owner, name: "wallet", type: "transaction" },
      { userId: owner, name: "gold", type: "asset" },
      { userId: owner, name: "fund", type: "asset" },
      { userId: stranger, name: "other gold", type: "asset" },
    ])
    .returning();
  [bank, wallet, gold, fund, foreignGold] = rows.map((r) => r.id);
  const [category] = await db
    .insert(categories)
    .values({ userId: owner, name: "Langganan", kind: "spending", spendingType: "needs" })
    .returning();
  spending = category.id;
});

afterAll(() => cleanup());

describe("recurring deposit rules", () => {
  it("creates a rule with a destination and no category", async () => {
    signInAs(owner);
    const res = await create(deposit());
    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({
      type: "transfer",
      accountId: bank,
      toAccountId: gold,
      categoryId: null,
    });
  });

  it("rejects a destination that is not an asset account", async () => {
    signInAs(owner);
    expect(await fieldError(await create(deposit({ toAccountId: wallet })))).toEqual([
      "toAccountId",
    ]);
  });

  it("rejects a source that is not a transaction account", async () => {
    signInAs(owner);
    const res = await create(deposit({ accountId: gold, toAccountId: fund }));
    expect(await fieldError(res)).toEqual(["accountId"]);
  });

  it("rejects another user's asset account", async () => {
    signInAs(owner);
    expect(await fieldError(await create(deposit({ toAccountId: foreignGold })))).toEqual([
      "toAccountId",
    ]);
  });

  it("moves the money into the asset on Catat, once per client id", async () => {
    signInAs(owner);
    const rule = await createdRule(deposit({ name: "Catat" }));
    const body = {
      action: "post",
      occurrenceDate: rule.nextDueDate,
      id: randomUUID(),
      amount: 200_000,
      date: "2026-10-05",
      accountId: bank,
      toAccountId: gold,
      description: "Catat",
    };

    const first = await advance(rule.id, body);
    expect(first.status).toBe(200);
    const { transaction } = (await first.json()) as AdvanceResult;
    expect(transaction).toMatchObject({ type: "transfer", toAccountId: gold, categoryId: null });
    expect(await balanceOf(bank)).toBe(800_000);
    expect(await balanceOf(gold)).toBe(200_000);

    expect((await advance(rule.id, body)).status).toBe(200);
    expect(await balanceOf(gold)).toBe(200_000);
    expect(await db.$count(transactions, eq(transactions.userId, owner))).toBe(1);
  });

  describe("editing", () => {
    it("moves a deposit to another asset account", async () => {
      signInAs(owner);
      const rule = await createdRule(deposit({ name: "Pindah" }));
      const res = await patch(rule.id, { toAccountId: fund });
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ toAccountId: fund, categoryId: null });
    });

    it("refuses a destination that is not an asset account", async () => {
      signInAs(owner);
      const rule = await createdRule(deposit({ name: "Bukan aset" }));
      expect(await fieldError(await patch(rule.id, { toAccountId: wallet }))).toEqual([
        "toAccountId",
      ]);
    });

    it("refuses a category on a deposit", async () => {
      signInAs(owner);
      const rule = await createdRule(deposit({ name: "Kategori" }));
      expect(await fieldError(await patch(rule.id, { categoryId: spending }))).toEqual([
        "categoryId",
      ]);
    });

    it("refuses a destination on an expense rule", async () => {
      signInAs(owner);
      const rule = await createdRule(expense());
      expect(await fieldError(await patch(rule.id, { toAccountId: gold }))).toEqual([
        "toAccountId",
      ]);
    });
  });

  it("refuses a Catat without a destination", async () => {
    signInAs(owner);
    const rule = await createdRule(deposit({ name: "Tanpa" }));
    const res = await advance(rule.id, {
      action: "post",
      occurrenceDate: rule.nextDueDate,
      id: randomUUID(),
      amount: 1,
      date: "2026-10-05",
      accountId: bank,
      description: "x",
    });
    expect(await fieldError(res)).toEqual(["toAccountId"]);
  });
});

describe("a rule's source account", () => {
  it("cannot be an asset account on create", async () => {
    signInAs(owner);
    expect(await fieldError(await create(expense({ accountId: gold })))).toEqual(["accountId"]);
  });

  it("cannot become an asset account on edit", async () => {
    signInAs(owner);
    const rule = await createdRule(expense());
    expect(await fieldError(await patch(rule.id, { accountId: gold }))).toEqual(["accountId"]);
  });

  it("cannot be an asset account on Catat", async () => {
    signInAs(owner);
    const rule = await createdRule(expense());
    const res = await advance(rule.id, {
      action: "post",
      occurrenceDate: rule.nextDueDate,
      id: randomUUID(),
      amount: 1,
      date: "2026-10-05",
      accountId: gold,
      categoryId: spending,
      description: "Netflix",
    });
    expect(await fieldError(res)).toEqual(["accountId"]);
  });
});

describe("Catat refuses", () => {
  const post = (rule: RecurringRule, overrides: Record<string, unknown>) => ({
    action: "post",
    occurrenceDate: rule.nextDueDate,
    id: randomUUID(),
    amount: 1,
    date: "2026-10-05",
    accountId: bank,
    description: "x",
    ...overrides,
  });

  it.each([
    ["a category on a deposit", "categoryId", () => ({ toAccountId: gold, categoryId: spending })],
    ["the source as a deposit's destination", "toAccountId", () => ({ toAccountId: bank })],
    ["another user's asset account", "toAccountId", () => ({ toAccountId: foreignGold })],
    ["a destination that is not an asset", "toAccountId", () => ({ toAccountId: wallet })],
  ])("%s", async (_, field, overrides) => {
    signInAs(owner);
    const rule = await createdRule(deposit());
    expect(await fieldError(await advance(rule.id, post(rule, overrides())))).toEqual([field]);
  });

  it.each([
    [
      "a destination on an expense",
      "toAccountId",
      () => ({ categoryId: spending, toAccountId: gold }),
    ],
    ["an expense without a category", "categoryId", () => ({})],
  ])("%s", async (_, field, overrides) => {
    signInAs(owner);
    const rule = await createdRule(expense());
    expect(await fieldError(await advance(rule.id, post(rule, overrides())))).toEqual([field]);
  });
});

it("refuses another user's asset account when editing a deposit", async () => {
  signInAs(owner);
  const rule = await createdRule(deposit());
  expect(await fieldError(await patch(rule.id, { toAccountId: foreignGold }))).toEqual([
    "toAccountId",
  ]);
});
