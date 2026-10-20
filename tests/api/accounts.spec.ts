import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accountBalances, accounts, categories, transactions } from "@/db/schema";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const collection = await import("@/app/api/accounts/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function list(query = "") {
  return collection.GET(new Request(`http://localhost/api/accounts${query}`), noParams);
}

function create(body: unknown) {
  return collection.POST(
    new Request("http://localhost/api/accounts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    noParams,
  );
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;
});

afterAll(async () => {
  await cleanup();
});

describe("POST /api/accounts", () => {
  it("creates an account and returns it with its balance", async () => {
    signInAs(userA);
    const res = await create({ name: "BCA", type: "transaction", initialBalance: 100_000 });

    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      id: expect.any(String),
      name: "BCA",
      type: "transaction",
      subtype: null,
      initialBalance: 100_000,
      balance: 100_000,
      archivedAt: null,
      createdAt: expect.any(String),
    });
  });

  it("accepts a negative initial balance", async () => {
    signInAs(userA);
    const res = await create({ name: "Kartu Kredit", type: "transaction", subtype: "credit_card", initialBalance: -500_000 });

    expect(res.status).toBe(201);
    expect(await res.json()).toMatchObject({ initialBalance: -500_000, balance: -500_000, subtype: "credit_card" });
  });

  it.each([1.5, "100", 1e12 + 1])("returns 400 with fields.initialBalance for %j", async (initialBalance) => {
    signInAs(userA);
    const res = await create({ name: "Salah", type: "transaction", initialBalance });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fields.initialBalance).toBeDefined();
  });

  it.each(["", "x".repeat(51)])("returns 400 with fields.name for name %j", async (name) => {
    signInAs(userA);
    const res = await create({ name, type: "transaction" });

    expect(res.status).toBe(400);
    expect((await res.json()).error.fields.name).toBeDefined();
  });

  it("returns 400 INVALID_JSON for a malformed body", async () => {
    signInAs(userA);
    const res = await create("{nope");
    expect((await res.json()).error.code).toBe("INVALID_JSON");
  });

  it("returns 409 ACCOUNT_NAME_TAKEN for a duplicate name in another case", async () => {
    signInAs(userA);
    const res = await create({ name: "bca", type: "asset" });

    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("ACCOUNT_NAME_TAKEN");
  });

  it("returns 409 when the name belongs to an archived account", async () => {
    await db.insert(accounts).values({ userId: userA, name: "Lama", type: "asset", archivedAt: new Date() });
    signInAs(userA);

    expect((await create({ name: "LAMA", type: "asset" })).status).toBe(409);
  });

  it("ignores a userId in the body", async () => {
    signInAs(userA);
    const res = await create({ name: "Milik A", type: "asset", userId: userB });
    const { id } = await res.json();

    const [row] = await db.select({ userId: accounts.userId }).from(accounts).where(eq(accounts.id, id));
    expect(row.userId).toBe(userA);
  });

  it("lets another user reuse the same name", async () => {
    signInAs(userB);
    expect((await create({ name: "BCA", type: "transaction" })).status).toBe(201);
  });
});

describe("GET /api/accounts", () => {
  it("orders transaction accounts before assets, then by name case-insensitively", async () => {
    signInAs(userA);
    const names = (await (await list()).json()).map((a: { type: string; name: string }) => `${a.type}:${a.name}`);

    expect(names).toEqual(["transaction:BCA", "transaction:Kartu Kredit", "asset:Milik A"]);
  });

  it("hides archived accounts unless include=archived", async () => {
    signInAs(userA);
    const all = await (await list("?include=archived")).json();

    expect(all.map((a: { name: string }) => a.name)).toContain("Lama");
    expect(all.find((a: { name: string }) => a.name === "Lama").archivedAt).toEqual(expect.any(String));
  });

  it("matches account_balances after income, expense, transfer and adjustment rows", async () => {
    const [x, y] = await db
      .insert(accounts)
      .values([
        { userId: userB, name: "X", type: "transaction", initialBalance: 100_000 },
        { userId: userB, name: "Y", type: "asset", initialBalance: 0 },
      ])
      .returning({ id: accounts.id });
    const [salary, food] = await db
      .insert(categories)
      .values([
        { userId: userB, name: "Gaji", kind: "income" },
        { userId: userB, name: "Makan", kind: "spending", spendingType: "needs" },
      ])
      .returning({ id: categories.id });
    await db.insert(transactions).values([
      { userId: userB, type: "income", amount: 40_000, date: "2026-10-01", accountId: x.id, categoryId: salary.id },
      { userId: userB, type: "expense", amount: 15_000, date: "2026-10-02", accountId: x.id, categoryId: food.id },
      { userId: userB, type: "transfer", amount: 5_000, date: "2026-10-03", accountId: x.id, toAccountId: y.id },
      { userId: userB, type: "adjustment", amount: 25_000, date: "2026-10-04", accountId: x.id },
      { userId: userB, type: "adjustment", amount: 1_000, date: "2026-10-05", accountId: x.id, deletedAt: new Date() },
    ]);

    signInAs(userB);
    const body: { id: string; balance: number; initialBalance: number }[] = await (await list()).json();
    const views = await db.select().from(accountBalances).where(inArray(accountBalances.accountId, [x.id, y.id]));

    for (const v of views) {
      expect(body.find((a) => a.id === v.accountId)?.balance).toBe(v.balance);
    }
    expect(body.find((a) => a.id === x.id)).toMatchObject({ balance: 145_000, initialBalance: 125_000 });
  });

  it("never returns another user's accounts", async () => {
    signInAs(userB);
    const body: { name: string }[] = await (await list("?include=archived")).json();
    expect(body.map((a) => a.name).sort()).toEqual(["BCA", "X", "Y"]);
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    expect((await list()).status).toBe(401);
    expect((await create({ name: "Z", type: "asset" })).status).toBe(401);
  });
});
