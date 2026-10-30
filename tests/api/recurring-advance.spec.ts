import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, categories, recurringRules, transactions } from "@/db/schema";
import type { AdvanceResult, RecurringOverview } from "@/lib/schemas/recurring";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const advanceRoute = await import("@/app/api/recurring/[id]/advance/route");
const collection = await import("@/app/api/recurring/route");
const accountsRoute = await import("@/app/api/accounts/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
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

async function balanceOf(accountId: string) {
  const res = await accountsRoute.GET(
    new Request("http://localhost/api/accounts?include=archived"),
    noParams,
  );
  const list = (await res.json()) as { id: string; balance: number }[];
  return list.find((a) => a.id === accountId)?.balance;
}

async function nextDueOf(ruleId: string) {
  const [row] = await db
    .select({ d: recurringRules.nextDueDate })
    .from(recurringRules)
    .where(eq(recurringRules.id, ruleId));
  return row.d;
}

function countTransactions(userId: string) {
  return db.$count(transactions, eq(transactions.userId, userId));
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;
let account: string;
let archivedAccount: string;
let foreignAccount: string;
let cat: Record<"income" | "spending" | "archivedSpending" | "foreignSpending", string>;
let ruleId: string;

function post(overrides: Record<string, unknown> = {}) {
  return {
    action: "post",
    occurrenceDate: "2026-10-05",
    id: randomUUID(),
    amount: 190_000,
    date: "2026-10-05",
    accountId: account,
    categoryId: cat.spending,
    description: "Netflix",
    ...overrides,
  };
}

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;

  const archivedAt = new Date();
  const accountRows = await db
    .insert(accounts)
    .values([
      { userId: userA, name: "account", type: "transaction", initialBalance: 1_000_000 },
      { userId: userA, name: "archivedAccount", type: "transaction", archivedAt },
      { userId: userB, name: "foreignAccount", type: "transaction" },
    ])
    .returning({ id: accounts.id, name: accounts.name });
  const accountId = (name: string) => accountRows.find((r) => r.name === name)!.id;
  account = accountId("account");
  archivedAccount = accountId("archivedAccount");
  foreignAccount = accountId("foreignAccount");

  const categoryRows = await db
    .insert(categories)
    .values([
      { userId: userA, name: "income", kind: "income" },
      { userId: userA, name: "spending", kind: "spending", spendingType: "wants" },
      {
        userId: userA,
        name: "archivedSpending",
        kind: "spending",
        spendingType: "wants",
        archivedAt,
      },
      { userId: userB, name: "foreignSpending", kind: "spending", spendingType: "wants" },
    ])
    .returning({ id: categories.id, name: categories.name });
  cat = Object.fromEntries(categoryRows.map((r) => [r.name, r.id])) as typeof cat;
});

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-27T03:00:00Z"));
  signInAs(userA);
  // Netflix on the 5th, last handled in September, so 5 Oct is due.
  const [rule] = await db
    .insert(recurringRules)
    .values({
      userId: userA,
      type: "expense",
      name: "Netflix",
      amount: 186_000,
      accountId: account,
      categoryId: cat.spending,
      dayOfMonth: 5,
      nextDueDate: "2026-10-05",
    })
    .returning({ id: recurringRules.id });
  ruleId = rule.id;
});

afterEach(async () => {
  vi.useRealTimers();
  await db.delete(transactions).where(eq(transactions.userId, userA));
  await db.delete(recurringRules).where(eq(recurringRules.userId, userA));
});

afterAll(async () => {
  await cleanup();
});

describe("post", () => {
  it("records the transaction with the rule's type and moves the rule one month", async () => {
    const before = await balanceOf(account);
    const body = post();
    const res = await advance(ruleId, body);
    expect(res.status).toBe(200);
    const result = (await res.json()) as AdvanceResult;
    expect(result.rule.nextDueDate).toBe("2026-11-05");
    expect(result.transaction).toMatchObject({
      id: body.id,
      type: "expense",
      amount: 190_000,
      date: "2026-10-05",
      description: "Netflix",
    });
    expect(await balanceOf(account)).toBe(before! - 190_000);
  });

  it("replays a repeated request without a second row or a second advance", async () => {
    const body = post();
    const first = (await (await advance(ruleId, body)).json()) as AdvanceResult;
    const again = await advance(ruleId, body);
    expect(again.status).toBe(200);
    const replay = (await again.json()) as AdvanceResult;
    expect(replay.transaction).toEqual(first.transaction);
    expect(replay.rule.nextDueDate).toBe("2026-11-05");
    expect(await countTransactions(userA)).toBe(1);
  });

  it("lets exactly one of two parallel posts through", async () => {
    const results = await Promise.all([advance(ruleId, post()), advance(ruleId, post())]);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses).toEqual([200, 409]);
    const conflict = await results.find((r) => r.status === 409)!.json();
    expect(conflict.error.code).toBe("OCCURRENCE_STALE");
    expect(await countTransactions(userA)).toBe(1);
    expect(await nextDueOf(ruleId)).toBe("2026-11-05");
  });

  it("replays a retry that raced its own first attempt", async () => {
    const body = post();
    const results = await Promise.all([advance(ruleId, body), advance(ruleId, body)]);
    expect(results.map((r) => r.status)).toEqual([200, 200]);
    expect(await countTransactions(userA)).toBe(1);
  });

  it.each([
    ["a category of the wrong kind", "categoryId", () => ({ categoryId: cat.income })],
    ["an archived account", "accountId", () => ({ accountId: archivedAccount })],
    ["an archived category", "categoryId", () => ({ categoryId: cat.archivedSpending })],
    ["user B's account", "accountId", () => ({ accountId: foreignAccount })],
    ["user B's category", "categoryId", () => ({ categoryId: cat.foreignSpending })],
    ["a future date", "date", () => ({ date: "2026-10-28" })],
    ["amount 0", "amount", () => ({ amount: 0 })],
  ])("rejects %s with 400 and leaves the rule where it was", async (_label, field, override) => {
    const res = await advance(ruleId, post(override()));
    expect(res.status).toBe(400);
    expect((await res.json()).error.fields[field]).toBeDefined();
    expect(await nextDueOf(ruleId)).toBe("2026-10-05");
    expect(await countTransactions(userA)).toBe(0);
  });

  it("rejects an id already used by user B's transaction without leaking it", async () => {
    const [other] = await db
      .insert(transactions)
      .values({
        userId: userB,
        type: "expense",
        amount: 5,
        date: "2026-10-01",
        accountId: foreignAccount,
        categoryId: cat.foreignSpending,
      })
      .returning({ id: transactions.id });
    const res = await advance(ruleId, post({ id: other.id }));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error.code).toBe("TRANSACTION_ID_TAKEN");
    expect(JSON.stringify(body)).not.toContain(foreignAccount);
    expect(await nextDueOf(ruleId)).toBe("2026-10-05");
    await db.delete(transactions).where(eq(transactions.id, other.id));
  });

  it("rejects reusing the id of an unrelated transaction of the same user", async () => {
    const [own] = await db
      .insert(transactions)
      .values({
        userId: userA,
        type: "expense",
        amount: 5,
        date: "2026-10-01",
        accountId: account,
        categoryId: cat.spending,
      })
      .returning({ id: transactions.id });
    const res = await advance(ruleId, post({ id: own.id }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("TRANSACTION_ID_TAKEN");
    expect(await nextDueOf(ruleId)).toBe("2026-10-05");
  });
});

describe("replay matching", () => {
  async function ownTransaction(date: string) {
    const [row] = await db
      .insert(transactions)
      .values({
        userId: userA,
        type: "expense",
        amount: 190_000,
        date,
        accountId: account,
        categoryId: cat.spending,
        description: "Netflix",
      })
      .returning({ id: transactions.id });
    return row.id;
  }

  it("does not replay an unrelated transaction for an occurrence two steps back", async () => {
    const id = await ownTransaction("2026-08-05");
    const res = await advance(
      ruleId,
      post({ id, occurrenceDate: "2026-08-05", date: "2026-08-05" }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("TRANSACTION_ID_TAKEN");
  });

  it("does not replay a transaction whose fields differ from the request", async () => {
    const id = await ownTransaction("2026-09-05");
    const res = await advance(
      ruleId,
      post({ id, occurrenceDate: "2026-09-05", date: "2026-09-05", amount: 1 }),
    );
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("TRANSACTION_ID_TAKEN");
    expect(await nextDueOf(ruleId)).toBe("2026-10-05");
  });
});

describe("skip", () => {
  it("moves the rule without writing a transaction", async () => {
    const res = await advance(ruleId, { action: "skip", occurrenceDate: "2026-10-05" });
    expect(res.status).toBe(200);
    const result = (await res.json()) as AdvanceResult;
    expect(result.transaction).toBeNull();
    expect(result.rule.nextDueDate).toBe("2026-11-05");
    expect(await countTransactions(userA)).toBe(0);
  });

  it.each(["2026-09-05", "2026-11-05"])(
    "returns 409 OCCURRENCE_STALE for occurrenceDate %s",
    async (occurrenceDate) => {
      const res = await advance(ruleId, { action: "skip", occurrenceDate });
      expect(res.status).toBe(409);
      expect((await res.json()).error.code).toBe("OCCURRENCE_STALE");
      expect(await nextDueOf(ruleId)).toBe("2026-10-05");
    },
  );

  it("allows handling a future occurrence early", async () => {
    await db
      .update(recurringRules)
      .set({ nextDueDate: "2026-11-05" })
      .where(eq(recurringRules.id, ruleId));
    const res = await advance(ruleId, { action: "skip", occurrenceDate: "2026-11-05" });
    expect(res.status).toBe(200);
    expect(await nextDueOf(ruleId)).toBe("2026-12-05");
  });

  it("handles a rule three months behind one occurrence at a time", async () => {
    await db
      .update(recurringRules)
      .set({ nextDueDate: "2026-07-05" })
      .where(eq(recurringRules.id, ruleId));
    await advance(ruleId, { action: "skip", occurrenceDate: "2026-07-05" });
    const res = await collection.GET(new Request("http://localhost/api/recurring"), noParams);
    const { due } = (await res.json()) as RecurringOverview;
    expect(due.find((r) => r.id === ruleId)?.nextDueDate).toBe("2026-08-05");
  });
});

describe("not found and isolation", () => {
  it("returns 404 for an archived rule", async () => {
    await db
      .update(recurringRules)
      .set({ archivedAt: new Date() })
      .where(eq(recurringRules.id, ruleId));
    const res = await advance(ruleId, { action: "skip", occurrenceDate: "2026-10-05" });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("RULE_NOT_FOUND");
  });

  it.each(["not-a-uuid", "8d2c0f4e-2a3b-4c5d-8e6f-7a8b9c0d1e2f"])(
    "returns 404 for id %s",
    async (id) => {
      expect((await advance(id, { action: "skip", occurrenceDate: "2026-10-05" })).status).toBe(
        404,
      );
    },
  );

  it("returns 404 to user B and changes nothing", async () => {
    signInAs(userB);
    expect((await advance(ruleId, { action: "skip", occurrenceDate: "2026-10-05" })).status).toBe(
      404,
    );
    expect(
      (await advance(ruleId, post({ accountId: foreignAccount, categoryId: cat.foreignSpending })))
        .status,
    ).toBe(404);
    expect(await nextDueOf(ruleId)).toBe("2026-10-05");
    expect(
      await db.$count(
        transactions,
        and(eq(transactions.userId, userB), eq(transactions.accountId, foreignAccount)),
      ),
    ).toBe(0);
  });

  it("rejects an unknown action and a malformed body", async () => {
    expect((await advance(ruleId, { action: "undo", occurrenceDate: "2026-10-05" })).status).toBe(
      400,
    );
    expect(
      (await advance(ruleId, { action: "skip", occurrenceDate: "2026-10-05", userId: userB }))
        .status,
    ).toBe(400);
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    expect((await advance(ruleId, { action: "skip", occurrenceDate: "2026-10-05" })).status).toBe(
      401,
    );
  });
});
