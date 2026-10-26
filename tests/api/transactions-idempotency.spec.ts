import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { todayInJakarta } from "@/lib/date";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const collection = await import("@/app/api/transactions/route");
const itemRoute = await import("@/app/api/transactions/[id]/route");
const accountsRoute = await import("@/app/api/accounts/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };

function signInAs(userId: string) {
  mockedAuth.mockResolvedValue({ user: { id: userId } });
}

function create(body: unknown) {
  return collection.POST(
    new Request("http://localhost/api/transactions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    noParams,
  );
}

async function balanceOf(accountId: string) {
  const res = await accountsRoute.GET(new Request("http://localhost/api/accounts?include=archived"), noParams);
  const list = (await res.json()) as { id: string; balance: number }[];
  return list.find((a) => a.id === accountId)?.balance;
}

function countRows(userId: string) {
  return db.$count(transactions, eq(transactions.userId, userId));
}

async function insertAccount(userId: string, initialBalance = 0) {
  const [row] = await db
    .insert(accounts)
    .values({ userId, name: `Akun ${randomUUID()}`, type: "transaction", initialBalance })
    .returning({ id: accounts.id });
  return row.id;
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;
let spendingA: string;
let spendingB: string;

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;

  const rows = await db
    .insert(categories)
    .values([
      { userId: userA, name: "spending", kind: "spending", spendingType: "needs" },
      { userId: userB, name: "spending", kind: "spending", spendingType: "needs" },
    ])
    .returning({ id: categories.id, userId: categories.userId });
  spendingA = rows.find((r) => r.userId === userA)!.id;
  spendingB = rows.find((r) => r.userId === userB)!.id;
});

afterAll(async () => {
  await cleanup();
});

function expense<T extends Record<string, unknown>>(accountId: string, overrides: T = {} as T) {
  return { type: "expense", amount: 25_000, date: todayInJakarta(), accountId, categoryId: spendingA, ...overrides };
}

describe("POST /api/transactions with a client id", () => {
  it("creates the row with the given id", async () => {
    signInAs(userA);
    const id = randomUUID();

    const res = await create(expense(await insertAccount(userA), { id }));

    expect(res.status).toBe(201);
    expect((await res.json()).transaction.id).toBe(id);
  });

  it("answers a repeated body with 200 and the stored row, lowering the balance only once", async () => {
    signInAs(userA);
    const account = await insertAccount(userA, 100_000);
    const body = expense(account, { id: randomUUID() });

    const first = await create(body);
    const before = await countRows(userA);
    const second = await create(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    expect(await second.json()).toEqual(await first.json());
    expect(await countRows(userA)).toBe(before);
    expect(await balanceOf(account)).toBe(75_000);
  });

  it("replays a transfer with its fee without inserting either twice", async () => {
    signInAs(userA);
    const [from, to] = [await insertAccount(userA, 100_000), await insertAccount(userA)];
    const body = {
      type: "transfer",
      id: randomUUID(),
      amount: 40_000,
      date: todayInJakarta(),
      accountId: from,
      toAccountId: to,
      fee: { id: randomUUID(), amount: 2_500, categoryId: spendingA },
    };

    const first = await create(body);
    const before = await countRows(userA);
    const second = await create(body);

    expect(first.status).toBe(201);
    expect(second.status).toBe(200);
    const created = await first.json();
    expect(created.fee.id).toBe(body.fee.id);
    expect(await second.json()).toEqual(created);
    expect(await countRows(userA)).toBe(before);
    expect(await balanceOf(from)).toBe(57_500);
  });

  it("still replays after the account was archived", async () => {
    signInAs(userA);
    const account = await insertAccount(userA);
    const body = expense(account, { id: randomUUID() });
    expect((await create(body)).status).toBe(201);

    await db.update(accounts).set({ archivedAt: new Date() }).where(eq(accounts.id, account));

    expect((await create(body)).status).toBe(200);
  });

  it("replays a soft-deleted row without bringing it back", async () => {
    signInAs(userA);
    const body = expense(await insertAccount(userA), { id: randomUUID() });
    expect((await create(body)).status).toBe(201);
    await itemRoute.DELETE(new Request(`http://localhost/api/transactions/${body.id}`, { method: "DELETE" }), {
      params: Promise.resolve({ id: body.id }),
    });

    const res = await create(body);

    expect(res.status).toBe(200);
    expect((await res.json()).transaction.deletedAt).not.toBeNull();
    const [row] = await db.select().from(transactions).where(eq(transactions.id, body.id));
    expect(row.deletedAt).not.toBeNull();
  });

  it("inserts exactly one row for two parallel requests with the same id", async () => {
    signInAs(userA);
    const body = expense(await insertAccount(userA), { id: randomUUID() });

    const statuses = (await Promise.all([create(body), create(body)])).map((r) => r.status).sort();

    expect(statuses).toEqual([200, 201]);
    expect(await db.$count(transactions, eq(transactions.id, body.id))).toBe(1);
  });

  it("inserts exactly one transfer and fee for two parallel requests", async () => {
    signInAs(userA);
    const body = {
      type: "transfer",
      id: randomUUID(),
      amount: 10_000,
      date: todayInJakarta(),
      accountId: await insertAccount(userA),
      toAccountId: await insertAccount(userA),
      fee: { id: randomUUID(), amount: 1_000, categoryId: spendingA },
    };

    const statuses = (await Promise.all([create(body), create(body)])).map((r) => r.status).sort();

    expect(statuses).toEqual([200, 201]);
    expect(await db.$count(transactions, inArray(transactions.id, [body.id, body.fee.id]))).toBe(2);
  });
});

describe("client ids across users", () => {
  it("rejects user B reusing user A's id with 409 and no data from A", async () => {
    signInAs(userA);
    const body = expense(await insertAccount(userA), { id: randomUUID() });
    await create(body);
    const [before] = await db.select().from(transactions).where(eq(transactions.id, body.id));

    signInAs(userB);
    const res = await create(expense(await insertAccount(userB), { id: body.id, categoryId: spendingB, amount: 1 }));

    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json).toEqual({ error: { code: "TRANSACTION_ID_TAKEN", message: expect.any(String) } });
    const [after] = await db.select().from(transactions).where(eq(transactions.id, body.id));
    expect(after).toEqual(before);
  });

  it("rejects user B reusing user A's fee id with 409", async () => {
    signInAs(userA);
    const feeId = randomUUID();
    await create({
      type: "transfer",
      id: randomUUID(),
      amount: 10_000,
      date: todayInJakarta(),
      accountId: await insertAccount(userA),
      toAccountId: await insertAccount(userA),
      fee: { id: feeId, amount: 1_000, categoryId: spendingA },
    });

    signInAs(userB);
    const res = await create({
      type: "transfer",
      id: randomUUID(),
      amount: 10_000,
      date: todayInJakarta(),
      accountId: await insertAccount(userB),
      toAccountId: await insertAccount(userB),
      fee: { id: feeId, amount: 1_000, categoryId: spendingB },
    });

    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("TRANSACTION_ID_TAKEN");
    expect(await countRows(userB)).toBe(0);
  });
});

describe("client id validation", () => {
  it("rejects a fee.id equal to the id on fields.fee", async () => {
    signInAs(userA);
    const id = randomUUID();
    const res = await create({
      type: "transfer",
      id,
      amount: 10_000,
      date: todayInJakarta(),
      accountId: await insertAccount(userA),
      toAccountId: await insertAccount(userA),
      fee: { id, amount: 1_000, categoryId: spendingA },
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error.fields.fee).toBeDefined();
  });

  it("rejects a non-UUID id on fields.id", async () => {
    signInAs(userA);
    const res = await create(expense(await insertAccount(userA), { id: "not-a-uuid" }));

    expect(res.status).toBe(400);
    expect((await res.json()).error.fields.id).toBeDefined();
  });

  it("rejects id on PATCH", async () => {
    signInAs(userA);
    const created = await (await create(expense(await insertAccount(userA)))).json();
    const id = created.transaction.id as string;

    const res = await itemRoute.PATCH(
      new Request(`http://localhost/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: randomUUID(), amount: 1_000 }),
      }),
      { params: Promise.resolve({ id }) },
    );

    expect(res.status).toBe(400);
  });
});
