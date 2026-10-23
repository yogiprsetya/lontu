import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { todayInJakarta } from "@/lib/date";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const collection = await import("@/app/api/transactions/route");
const accountsRoute = await import("@/app/api/accounts/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function create(body: unknown) {
  return collection.POST(
    new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    noParams,
  );
}

async function balanceOf(accountId: string) {
  const res = await accountsRoute.GET(new Request("http://localhost/api/accounts?include=archived"), noParams);
  const list = (await res.json()) as { id: string; balance: number }[];
  return list.find((a) => a.id === accountId)?.balance;
}

async function insertFundedAccount(userId: string, initialBalance: number) {
  const [row] = await db
    .insert(accounts)
    .values({ userId, name: `Akun ${randomUUID()}`, type: "transaction", initialBalance })
    .returning({ id: accounts.id });
  return row.id;
}

function countRows(userId: string) {
  return db.$count(transactions, eq(transactions.userId, userId));
}

function tomorrowInJakarta() {
  return todayInJakarta(new Date(Date.now() + 24 * 60 * 60 * 1000));
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;
let account: string;
let archivedAccount: string;
let foreignAccount: string;
let otherAccount: string;
let cat: Record<"income" | "saving" | "spending" | "archivedSpending" | "foreignSpending", string>;

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;

  // One multi-row insert per table: parallel single-row inserts each open a pooler
  // connection and blow the 10 s hook timeout when the whole suite runs.
  const archivedAt = new Date();
  const accountRows = await db
    .insert(accounts)
    .values([
      { userId: userA, name: "account", type: "transaction" },
      { userId: userA, name: "archivedAccount", type: "transaction", archivedAt },
      { userId: userA, name: "otherAccount", type: "transaction" },
      { userId: userB, name: "foreignAccount", type: "transaction" },
    ])
    .returning({ id: accounts.id, name: accounts.name });
  ({ account, archivedAccount, foreignAccount, otherAccount } = Object.fromEntries(accountRows.map((r) => [r.name, r.id])));

  const categoryRows = await db
    .insert(categories)
    .values([
      { userId: userA, name: "income", kind: "income" },
      { userId: userA, name: "saving", kind: "saving" },
      { userId: userA, name: "spending", kind: "spending", spendingType: "needs" },
      { userId: userA, name: "archivedSpending", kind: "spending", spendingType: "needs", archivedAt },
      { userId: userB, name: "foreignSpending", kind: "spending", spendingType: "needs" },
    ])
    .returning({ id: categories.id, name: categories.name });
  cat = Object.fromEntries(categoryRows.map((r) => [r.name, r.id])) as typeof cat;
});

afterAll(async () => {
  await cleanup();
});

function expense(overrides: Record<string, unknown> = {}) {
  return {
    type: "expense",
    amount: 25_000,
    date: todayInJakarta(),
    accountId: account,
    categoryId: cat.spending,
    ...overrides,
  };
}

async function expectFieldError(res: Response, field: string) {
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error.code).toBe("VALIDATION_ERROR");
  expect(body.error.fields[field]).toBeDefined();
  return body.error.fields[field][0] as string;
}

describe("POST /api/transactions", () => {
  it("creates an expense, returns it with fee null, and lowers the account balance", async () => {
    signInAs(userA);
    const funded = await insertFundedAccount(userA, 100_000);
    const today = todayInJakarta();

    const res = await create(expense({ accountId: funded, date: today, description: " Makan siang " }));

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      transaction: {
        id: expect.any(String),
        type: "expense",
        amount: 25_000,
        date: today,
        accountId: funded,
        toAccountId: null,
        categoryId: cat.spending,
        description: "Makan siang",
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
        deletedAt: null,
      },
      fee: null,
    });
    expect(await balanceOf(funded)).toBe(75_000);
  });

  it("raises the balance for income and lowers it for saving", async () => {
    signInAs(userA);
    const funded = await insertFundedAccount(userA, 100_000);

    expect((await create(expense({ type: "income", amount: 50_000, accountId: funded, categoryId: cat.income }))).status).toBe(201);
    expect(await balanceOf(funded)).toBe(150_000);

    expect((await create(expense({ type: "saving", amount: 30_000, accountId: funded, categoryId: cat.saving }))).status).toBe(201);
    expect(await balanceOf(funded)).toBe(120_000);
  });

  it("stores an empty description as null", async () => {
    signInAs(userA);
    const res = await create(expense({ description: "" }));
    expect(res.status).toBe(201);
    expect((await res.json()).transaction.description).toBeNull();
  });

  it.each([0, -1, 1.5, "100", 1e12 + 1])("returns 400 fields.amount for %j", async (amount) => {
    signInAs(userA);
    await expectFieldError(await create(expense({ amount })), "amount");
  });

  it.each([["21-10-2026"], ["1999-12-31"], [tomorrowInJakarta()]])("returns 400 fields.date for %s", async (date) => {
    signInAs(userA);
    await expectFieldError(await create(expense({ date })), "date");
  });

  it("returns 400 fields.description for 201 characters", async () => {
    signInAs(userA);
    await expectFieldError(await create(expense({ description: "x".repeat(201) })), "description");
  });

  it("returns 400 fields.type for type adjustment", async () => {
    signInAs(userA);
    await expectFieldError(await create(expense({ type: "adjustment" })), "type");
  });

  it.each([{ userId: "test-someone-else" }, { fee: { amount: 1000 } }])("returns 400 for unknown field %j", async (extra) => {
    signInAs(userA);
    const res = await create(expense(extra));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 fields.categoryId for income without a category", async () => {
    signInAs(userA);
    await expectFieldError(await create(expense({ type: "income", categoryId: undefined })), "categoryId");
  });

  it("gives the same accountId message for a foreign and an unknown account, and writes nothing", async () => {
    signInAs(userA);
    const before = await countRows(userA);

    const foreign = await expectFieldError(await create(expense({ accountId: foreignAccount })), "accountId");
    const unknown = await expectFieldError(await create(expense({ accountId: randomUUID() })), "accountId");

    expect(foreign).toBe(unknown);
    expect(await countRows(userA)).toBe(before);
    expect(await countRows(userB)).toBe(0);
  });

  it("returns 400 fields.accountId for an archived account", async () => {
    signInAs(userA);
    await expectFieldError(await create(expense({ accountId: archivedAccount })), "accountId");
  });

  it("gives the same categoryId message for a foreign and an unknown category", async () => {
    signInAs(userA);
    const foreign = await expectFieldError(await create(expense({ categoryId: cat.foreignSpending })), "categoryId");
    const unknown = await expectFieldError(await create(expense({ categoryId: randomUUID() })), "categoryId");
    expect(foreign).toBe(unknown);
  });

  it("returns 400 fields.categoryId for an archived category", async () => {
    signInAs(userA);
    await expectFieldError(await create(expense({ categoryId: cat.archivedSpending })), "categoryId");
  });

  it.each([
    ["expense", "income"],
    ["income", "spending"],
    ["saving", "spending"],
  ] as const)("returns 400 fields.categoryId for a %s with a %s category", async (type, kind) => {
    signInAs(userA);
    await expectFieldError(await create(expense({ type, categoryId: cat[kind] })), "categoryId");
  });

  it("returns 401 UNAUTHORIZED without a session", async () => {
    signInAs(null);
    const res = await create(expense());
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });

  it("returns 400 INVALID_JSON for a malformed body", async () => {
    signInAs(userA);
    const res = await create("{nope");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("INVALID_JSON");
  });
});

describe("POST /api/transactions transfer", () => {
  function transfer(overrides: Record<string, unknown> = {}) {
    return {
      type: "transfer",
      amount: 10_000,
      date: todayInJakarta(),
      accountId: account,
      toAccountId: otherAccount,
      ...overrides,
    };
  }

  it("moves the amount from the source to the destination without a category or fee", async () => {
    signInAs(userA);
    const from = await insertFundedAccount(userA, 100_000);
    const to = await insertFundedAccount(userA, 0);

    const res = await create(transfer({ accountId: from, toAccountId: to }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.transaction).toMatchObject({ type: "transfer", amount: 10_000, accountId: from, toAccountId: to, categoryId: null });
    expect(body.fee).toBeNull();
    expect(await balanceOf(from)).toBe(90_000);
    expect(await balanceOf(to)).toBe(10_000);
  });

  it("writes the admin fee as a separate expense on the source account", async () => {
    signInAs(userA);
    const from = await insertFundedAccount(userA, 100_000);
    const to = await insertFundedAccount(userA, 0);
    const date = todayInJakarta();

    const res = await create(transfer({ accountId: from, toAccountId: to, date, fee: { amount: 2_500, categoryId: cat.spending } }));

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.fee).toMatchObject({
      type: "expense",
      amount: 2_500,
      date,
      accountId: from,
      toAccountId: null,
      categoryId: cat.spending,
      description: "Biaya admin transfer",
    });
    expect(body.fee.id).not.toBe(body.transaction.id);
    expect(await balanceOf(from)).toBe(87_500);
    expect(await balanceOf(to)).toBe(10_000);
  });

  it("returns 400 fields.toAccountId when both accounts are the same", async () => {
    signInAs(userA);
    await expectFieldError(await create(transfer({ toAccountId: account })), "toAccountId");
  });

  it("returns 400 for a transfer with a categoryId", async () => {
    signInAs(userA);
    const res = await create(transfer({ categoryId: cat.spending }));
    expect(res.status).toBe(400);
  });

  it.each([
    ["an income fee category", { fee: { amount: 2_500, categoryId: "income" } }, "fee"],
    ["a zero fee", { fee: { amount: 0, categoryId: "spending" } }, "fee"],
    ["a foreign fee category", { fee: { amount: 2_500, categoryId: "foreignSpending" } }, "fee"],
    ["an archived fee category", { fee: { amount: 2_500, categoryId: "archivedSpending" } }, "fee"],
    ["an archived destination", { toAccountId: "archived" }, "toAccountId"],
    ["a foreign destination", { toAccountId: "foreign" }, "toAccountId"],
    ["a foreign source", { accountId: "foreign" }, "accountId"],
  ] as const)("rejects %s with 400 and writes no rows", async (_, overrides, field) => {
    signInAs(userA);
    const accountIds = { archived: archivedAccount, foreign: foreignAccount };
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(overrides)) {
      if (typeof value === "string") resolved[key] = accountIds[value as keyof typeof accountIds];
      else resolved[key] = { ...value, categoryId: cat[value.categoryId as keyof typeof cat] };
    }
    const before = await countRows(userA);

    await expectFieldError(await create(transfer(resolved)), field);

    expect(await countRows(userA)).toBe(before);
    expect(await countRows(userB)).toBe(0);
  });

  it("gives the same toAccountId message for a foreign and an unknown destination", async () => {
    signInAs(userA);
    const foreign = await expectFieldError(await create(transfer({ toAccountId: foreignAccount })), "toAccountId");
    const unknown = await expectFieldError(await create(transfer({ toAccountId: randomUUID() })), "toAccountId");
    expect(foreign).toBe(unknown);
  });
});
