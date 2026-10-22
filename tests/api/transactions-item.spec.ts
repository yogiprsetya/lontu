import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import type { Transaction } from "@/lib/schemas/transaction";
import { todayInJakarta } from "@/lib/date";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const itemRoute = await import("@/app/api/transactions/[id]/route");
const listRoute = await import("@/app/api/transactions/route");
const accountsRoute = await import("@/app/api/accounts/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });
const noParams = { params: Promise.resolve({}) };

function get(id: string) {
  return itemRoute.GET(new Request(`http://localhost/api/transactions/${id}`), ctx(id));
}

function patch(id: string, body: unknown) {
  return itemRoute.PATCH(
    new Request(`http://localhost/api/transactions/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    ctx(id),
  );
}

async function balanceOf(accountId: string) {
  const res = await accountsRoute.GET(new Request("http://localhost/api/accounts?include=archived"), noParams);
  return ((await res.json()) as { id: string; balance: number }[]).find((a) => a.id === accountId)?.balance;
}

async function listIds() {
  const res = await listRoute.GET(new Request("http://localhost/api/transactions?limit=100"), noParams);
  return ((await res.json()).items as Transaction[]).map((t) => t.id);
}

async function expectError(res: Response, status: number, code: string, field?: string) {
  expect(res.status).toBe(status);
  const body = await res.json();
  expect(body.error.code).toBe(code);
  if (field) expect(body.error.fields[field]).toBeDefined();
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;
let funded: string;
let other: string;
let archived: string;
let foreign: string;
let cat: Record<"spending" | "spending2" | "archivedSpending" | "foreignSpending" | "income", string>;

async function insertAccount(userId: string, name: string, initialBalance = 0, archivedAt?: Date) {
  const [row] = await db
    .insert(accounts)
    .values({ userId, name: `${name} ${randomUUID()}`, type: "transaction", initialBalance, archivedAt })
    .returning({ id: accounts.id });
  return row.id;
}

type Seed = Partial<typeof transactions.$inferInsert>;

async function seed(values: Seed = {}) {
  const [row] = await db
    .insert(transactions)
    .values({
      userId: userA,
      type: "expense",
      amount: 25_000,
      date: todayInJakarta(),
      accountId: funded,
      categoryId: cat.spending,
      ...values,
    })
    .returning();
  return row;
}

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;

  funded = await insertAccount(userA, "funded", 100_000);
  other = await insertAccount(userA, "other");
  archived = await insertAccount(userA, "archived", 0, new Date());
  foreign = await insertAccount(userB, "foreign");

  const rows = await db
    .insert(categories)
    .values([
      { userId: userA, name: "spending", kind: "spending", spendingType: "needs" },
      { userId: userA, name: "spending2", kind: "spending", spendingType: "wants" },
      { userId: userA, name: "archivedSpending", kind: "spending", spendingType: "needs", archivedAt: new Date() },
      { userId: userB, name: "foreignSpending", kind: "spending", spendingType: "needs" },
      { userId: userA, name: "income", kind: "income" },
    ])
    .returning({ id: categories.id, name: categories.name });
  cat = Object.fromEntries(rows.map((r) => [r.name, r.id])) as typeof cat;
});

afterAll(async () => {
  await cleanup();
});

describe("GET /api/transactions/[id]", () => {
  it("returns the transaction", async () => {
    signInAs(userA);
    const row = await seed({ description: "kopi" });
    const res = await get(row.id);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ id: row.id, type: "expense", amount: 25_000, description: "kopi", deletedAt: null });
  });

  it.each([["not-a-uuid"], [randomUUID()]])("returns 404 TRANSACTION_NOT_FOUND for %s", async (id) => {
    signInAs(userA);
    await expectError(await get(id), 404, "TRANSACTION_NOT_FOUND");
  });

  it("returns 404 for a soft-deleted row", async () => {
    signInAs(userA);
    const row = await seed({ deletedAt: new Date() });
    await expectError(await get(row.id), 404, "TRANSACTION_NOT_FOUND");
  });

  it("returns 404 for another user's row", async () => {
    const row = await seed();
    signInAs(userB);
    await expectError(await get(row.id), 404, "TRANSACTION_NOT_FOUND");
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    await expectError(await get(randomUUID()), 401, "UNAUTHORIZED");
  });
});

describe("PATCH /api/transactions/[id]", () => {
  it("changes the amount, moves the balance, bumps updatedAt and keeps the list position", async () => {
    signInAs(userA);
    const account = await insertAccount(userA, "patch", 100_000);
    const older = await seed({ accountId: account, createdAt: new Date(Date.now() - 60_000) });
    const newer = await seed({ accountId: account });
    expect(await balanceOf(account)).toBe(50_000);
    const orderBefore = (await listIds()).filter((id) => [older.id, newer.id].includes(id));

    const res = await patch(older.id, { amount: 40_000 });

    expect(res.status).toBe(200);
    const body = (await res.json()) as Transaction;
    expect(body.amount).toBe(40_000);
    expect(new Date(body.updatedAt).getTime()).toBeGreaterThan(older.updatedAt.getTime());
    expect(await balanceOf(account)).toBe(35_000);
    expect((await listIds()).filter((id) => [older.id, newer.id].includes(id))).toEqual(orderBefore);
  });

  it("changes date, category, account and description, and clears the description with null", async () => {
    signInAs(userA);
    const row = await seed({ description: "lama" });
    const res = await patch(row.id, { date: "2026-01-02", categoryId: cat.spending2, accountId: other, description: null });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ date: "2026-01-02", categoryId: cat.spending2, accountId: other, description: null });
  });

  it("edits a transfer's amount and destination", async () => {
    signInAs(userA);
    const from = await insertAccount(userA, "from", 100_000);
    const to1 = await insertAccount(userA, "to1");
    const to2 = await insertAccount(userA, "to2");
    const row = await seed({ type: "transfer", accountId: from, toAccountId: to1, categoryId: null, amount: 10_000 });

    const res = await patch(row.id, { amount: 20_000, toAccountId: to2 });

    expect(res.status).toBe(200);
    expect(await balanceOf(from)).toBe(80_000);
    expect(await balanceOf(to1)).toBe(0);
    expect(await balanceOf(to2)).toBe(20_000);
  });

  it.each([
    ["type", { type: "income" }],
    ["userId", { userId: "someone" }],
    ["fee", { fee: { amount: 1, categoryId: "x" } }],
    ["toAccountId on an expense", { toAccountId: randomUUID() }],
  ])("returns 400 for %s", async (_, body) => {
    signInAs(userA);
    const row = await seed();
    await expectError(await patch(row.id, body), 400, "VALIDATION_ERROR");
  });

  it("returns 400 for an empty body and INVALID_JSON for a malformed one", async () => {
    signInAs(userA);
    const row = await seed();
    await expectError(await patch(row.id, {}), 400, "VALIDATION_ERROR");
    await expectError(await patch(row.id, "{nope"), 400, "INVALID_JSON");
  });

  it("returns 400 fields.toAccountId when a transfer would point at its own source", async () => {
    signInAs(userA);
    const row = await seed({ type: "transfer", accountId: funded, toAccountId: other, categoryId: null });
    await expectError(await patch(row.id, { toAccountId: funded }), 400, "VALIDATION_ERROR", "toAccountId");
    await expectError(await patch(row.id, { accountId: other }), 400, "VALIDATION_ERROR", "toAccountId");
  });

  it.each([
    ["an archived account", () => ({ accountId: archived }), "accountId"],
    ["a foreign account", () => ({ accountId: foreign }), "accountId"],
    ["an unknown account", () => ({ accountId: randomUUID() }), "accountId"],
    ["an archived category", () => ({ categoryId: cat.archivedSpending }), "categoryId"],
    ["a foreign category", () => ({ categoryId: cat.foreignSpending }), "categoryId"],
    ["a category of the wrong kind", () => ({ categoryId: cat.income }), "categoryId"],
  ])("returns 400 when moving to %s", async (_, body, field) => {
    signInAs(userA);
    const row = await seed();
    await expectError(await patch(row.id, body()), 400, "VALIDATION_ERROR", field);
    expect((await (await get(row.id)).json()).accountId).toBe(funded);
  });

  it("allows saving while the unchanged account and category are archived", async () => {
    signInAs(userA);
    const row = await seed({ accountId: archived, categoryId: cat.archivedSpending });
    const res = await patch(row.id, { amount: 1_234, description: "tetap bisa" });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ accountId: archived, categoryId: cat.archivedSpending, amount: 1_234 });
  });

  it("returns 409 TRANSACTION_NOT_EDITABLE for an adjustment", async () => {
    signInAs(userA);
    const row = await seed({ type: "adjustment", amount: 5_000, categoryId: null });
    await expectError(await patch(row.id, { amount: 6_000 }), 409, "TRANSACTION_NOT_EDITABLE");
  });

  it.each([["not-a-uuid"], [randomUUID()]])("returns 404 for %s", async (id) => {
    signInAs(userA);
    await expectError(await patch(id, { amount: 1 }), 404, "TRANSACTION_NOT_FOUND");
  });

  it("returns 404 for a soft-deleted row", async () => {
    signInAs(userA);
    const row = await seed({ deletedAt: new Date() });
    await expectError(await patch(row.id, { amount: 1 }), 404, "TRANSACTION_NOT_FOUND");
  });

  it("returns 404 and changes nothing for another user's row", async () => {
    const row = await seed();
    signInAs(userB);
    await expectError(await patch(row.id, { amount: 1 }), 404, "TRANSACTION_NOT_FOUND");
    const [after] = await db.select().from(transactions).where(and(eq(transactions.id, row.id), eq(transactions.userId, userA)));
    expect(after.amount).toBe(25_000);
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    await expectError(await patch(randomUUID(), { amount: 1 }), 401, "UNAUTHORIZED");
  });
});
