import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { todayInJakarta } from "@/lib/date";
import { addDays } from "@/lib/period";
import type { Account } from "@/lib/schemas/account";
import type { AssetValuation, ValuationResult } from "@/lib/schemas/valuation";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const route = await import("@/app/api/valuations/route");
const accountsRoute = await import("@/app/api/accounts/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

const noParams = { params: Promise.resolve({}) };

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function post(body: unknown) {
  return route.POST(
    new Request("http://localhost/api/valuations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    noParams,
  );
}

async function getValuations() {
  const res = await route.GET(new Request("http://localhost/api/valuations"), noParams);
  expect(res.status).toBe(200);
  return (await res.json()) as AssetValuation[];
}

async function listAccounts() {
  const res = await accountsRoute.GET(new Request("http://localhost/api/accounts"), noParams);
  return (await res.json()) as Account[];
}

async function balanceOf(accountId: string) {
  return (await listAccounts()).find((a) => a.id === accountId)?.balance;
}

async function revaluationsOf(accountId: string) {
  return db
    .select({ amount: transactions.amount, date: transactions.date })
    .from(transactions)
    .where(and(eq(transactions.accountId, accountId), eq(transactions.type, "revaluation")));
}

function revaluation(accountId: string, amount: number, date: string) {
  return { userId: userA, type: "revaluation", amount, date, accountId };
}

async function expectFieldError(res: Response, field: string) {
  expect(res.status).toBe(400);
  const body = await res.json();
  expect(body.error.code).toBe("VALIDATION_ERROR");
  expect(body.error.fields[field]).toBeDefined();
  return body.error.fields[field][0] as string;
}

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;

async function insertAccount(
  userId: string,
  name: string,
  values: Partial<typeof accounts.$inferInsert> = {},
) {
  const [row] = await db
    .insert(accounts)
    .values({ userId, name: `${name} ${randomUUID()}`, type: "asset", ...values })
    .returning({ id: accounts.id });
  return row.id;
}

function transfer(from: string, to: string, amount: number, date: string) {
  return { userId: userA, type: "transfer", amount, date, accountId: from, toAccountId: to };
}

beforeAll(async () => {
  const users = await createTestUsers(2);
  [userA, userB] = users.ids;
  cleanup = users.cleanup;
});

afterAll(() => cleanup());

describe("POST /api/valuations, base scenario", () => {
  let bca: string;
  let emas: string;
  let reksadana: string;

  beforeAll(async () => {
    bca = await insertAccount(userA, "BCA", { type: "transaction", subtype: "debit" });
    emas = await insertAccount(userA, "Emas", { subtype: "gold", initialBalance: 30_000_000 });
    reksadana = await insertAccount(userA, "RD Saham", { subtype: "investment" });
    await db
      .insert(transactions)
      .values([
        transfer(bca, reksadana, 3_000_000, "2026-08-10"),
        transfer(bca, reksadana, 4_000_000, "2026-09-10"),
        transfer(bca, emas, 5_000_000, "2026-10-10"),
        transfer(reksadana, emas, 1_000_000, "2026-10-20"),
      ]);
  });

  const checkIn = () => ({
    items: [
      { accountId: emas, value: 36_500_000 },
      { accountId: reksadana, value: 6_200_000 },
    ],
  });

  it("records the difference from each balance as one revaluation dated today", async () => {
    signInAs(userA);
    const today = todayInJakarta();
    const res = await post(checkIn());
    expect(res.status).toBe(200);
    const body = (await res.json()) as ValuationResult;
    expect(body.recorded).toBe(2);

    expect(await revaluationsOf(emas)).toEqual([{ amount: 500_000, date: today }]);
    expect(await revaluationsOf(reksadana)).toEqual([{ amount: 200_000, date: today }]);
    expect(await balanceOf(emas)).toBe(36_500_000);
    expect(await balanceOf(reksadana)).toBe(6_200_000);

    expect(body.assets.find((a) => a.accountId === emas)).toEqual({
      accountId: emas,
      balance: 36_500_000,
      marketGain: 500_000,
      contributed: 36_000_000,
      lastValuedAt: today,
      goalId: null,
    });
  });

  it("records nothing when the same request is sent again", async () => {
    signInAs(userA);
    const res = await post(checkIn());
    expect(((await res.json()) as ValuationResult).recorded).toBe(0);
    expect(await revaluationsOf(emas)).toHaveLength(1);
    expect(await revaluationsOf(reksadana)).toHaveLength(1);
  });

  it("rejects a second new value today on the item's field", async () => {
    signInAs(userA);
    const message = await expectFieldError(
      await post({ items: [{ accountId: emas, value: 36_400_000 }] }),
      "items.0",
    );
    expect(message).toBe("Nilai sudah diperbarui hari ini. Revaluasi hanya sekali sehari.");
    expect(await revaluationsOf(emas)).toHaveLength(1);
    expect(await balanceOf(emas)).toBe(36_500_000);
  });

  it("checks only the items that change, each against its own account", async () => {
    signInAs(userA);
    const today = todayInJakarta();
    const held = await insertAccount(userA, "Emas Galeri24", { initialBalance: 1_000 });
    const fresh = await insertAccount(userA, "Emas Antam", { initialBalance: 1_000 });
    await db.insert(transactions).values(revaluation(held, 200, today));
    // Held is already valued today, but its value is unchanged, so it writes nothing and passes.
    const res = await post({
      items: [
        { accountId: held, value: 1_200 },
        { accountId: fresh, value: 1_500 },
      ],
    });
    expect(((await res.json()) as ValuationResult).recorded).toBe(1);
    expect(await revaluationsOf(held)).toHaveLength(1);
    expect(await revaluationsOf(fresh)).toEqual([{ amount: 500, date: today }]);
  });

  it("accepts a new value when the latest revaluation is from yesterday", async () => {
    signInAs(userA);
    const today = todayInJakarta();
    const yesterday = addDays(today, -1);
    const account = await insertAccount(userA, "Kemarin", { initialBalance: 1_000 });
    await db.insert(transactions).values(revaluation(account, 100, yesterday));
    const res = await post({ items: [{ accountId: account, value: 1_300 }] });
    expect(res.status).toBe(200);
    expect(((await res.json()) as ValuationResult).recorded).toBe(1);
    expect(await revaluationsOf(account)).toEqual(
      expect.arrayContaining([
        { amount: 100, date: yesterday },
        { amount: 200, date: today },
      ]),
    );
    expect(await balanceOf(account)).toBe(1_300);
  });

  it("opens today again once today's revaluation is deleted", async () => {
    signInAs(userA);
    const account = await insertAccount(userA, "Buka lagi", { initialBalance: 1_000 });
    await post({ items: [{ accountId: account, value: 1_500 }] });
    await db
      .update(transactions)
      .set({ deletedAt: new Date() })
      .where(eq(transactions.accountId, account));
    const res = await post({ items: [{ accountId: account, value: 1_700 }] });
    expect(res.status).toBe(200);
    expect(((await res.json()) as ValuationResult).recorded).toBe(1);
    expect(await balanceOf(account)).toBe(1_700);
  });

  it("rejects a transaction account and writes none of the other items", async () => {
    signInAs(userA);
    const before = await revaluationsOf(reksadana);
    await expectFieldError(
      await post({
        items: [
          { accountId: reksadana, value: 9_999_999 },
          { accountId: bca, value: 1 },
        ],
      }),
      "items.1",
    );
    expect(await revaluationsOf(reksadana)).toEqual(before);
  });
});

describe("POST /api/valuations, current balance", () => {
  it("counts every adjustment, today's included, in the balance the delta comes from", async () => {
    signInAs(userA);
    const today = todayInJakarta();
    const account = await insertAccount(userA, "Reksadana", { initialBalance: 10_000_000 });
    await db.insert(transactions).values({
      userId: userA,
      type: "adjustment",
      amount: 1_000_000,
      date: today,
      accountId: account,
    });

    const res = await post({ items: [{ accountId: account, value: 12_000_000 }] });
    expect(((await res.json()) as ValuationResult).recorded).toBe(1);
    expect(await revaluationsOf(account)).toEqual([{ amount: 1_000_000, date: today }]);
    expect(await balanceOf(account)).toBe(12_000_000);
  });

  it("writes one revaluation when two identical check-ins race", async () => {
    signInAs(userA);
    const account = await insertAccount(userA, "Paralel", { initialBalance: 1_000_000 });
    const today = todayInJakarta();
    const body = { items: [{ accountId: account, value: 1_500_000 }] };
    const results = await Promise.all([post(body), post(body)]);
    const recorded = await Promise.all(
      results.map(async (r) => ((await r.json()) as ValuationResult).recorded),
    );
    expect(recorded.sort()).toEqual([0, 1]);
    expect(await revaluationsOf(account)).toEqual([{ amount: 500_000, date: today }]);
  });
});

describe("POST /api/valuations, validation", () => {
  it.each([
    ["yesterday", -1],
    ["today", 0],
    ["tomorrow", 1],
  ])("rejects a body dated %s, writing nothing", async (_, offset) => {
    signInAs(userA);
    const account = await insertAccount(userA, "Bertanggal", { initialBalance: 100 });
    const res = await post({
      date: addDays(todayInJakarta(), offset),
      items: [{ accountId: account, value: 200 }],
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    expect(await revaluationsOf(account)).toEqual([]);
  });

  it.each(["archived", "foreign", "missing"] as const)(
    "rejects a %s account with the item's field, writing nothing",
    async (kind) => {
      signInAs(userA);
      const valid = await insertAccount(userA, "Valid", { initialBalance: 100 });
      const bad =
        kind === "archived"
          ? await insertAccount(userA, "Arsip", { archivedAt: new Date() })
          : kind === "foreign"
            ? await insertAccount(userB, "Milik B")
            : randomUUID();
      await expectFieldError(
        await post({
          items: [
            { accountId: valid, value: 200 },
            { accountId: bad, value: 1 },
          ],
        }),
        "items.1",
      );
      expect(await revaluationsOf(valid)).toEqual([]);
      expect(await revaluationsOf(bad)).toEqual([]);
    },
  );

  it("gives a foreign and a missing account the same message", async () => {
    signInAs(userA);
    const foreign = await insertAccount(userB, "Milik B lagi");
    const body = (accountId: string) => ({ items: [{ accountId, value: 1 }] });
    expect(await expectFieldError(await post(body(foreign)), "items.0")).toBe(
      await expectFieldError(await post(body(randomUUID())), "items.0"),
    );
  });

  it("rejects userId in the body and invalid JSON", async () => {
    signInAs(userA);
    const account = await insertAccount(userA, "Body");
    const res = await post({ items: [{ accountId: account, value: 1 }], userId: userB });
    expect(res.status).toBe(400);
    expect((await post("{")).status).toBe(400);
  });
});

describe("GET /api/valuations", () => {
  it("lists active asset accounts in GET /api/accounts order, with contributed + marketGain = balance", async () => {
    signInAs(userA);
    await insertAccount(userA, "Arsip GET", { archivedAt: new Date() });
    const valuations = await getValuations();
    const assets = (await listAccounts()).filter((a) => a.type === "asset");

    expect(valuations.map((v) => v.accountId)).toEqual(assets.map((a) => a.id));
    for (const v of valuations) {
      expect(v.contributed + v.marketGain).toBe(v.balance);
      expect(v.balance).toBe(assets.find((a) => a.id === v.accountId)?.balance);
      expect(v.goalId).toBeNull();
    }
  });

  it("leaves a deleted revaluation out of marketGain and lastValuedAt", async () => {
    signInAs(userA);
    const account = await insertAccount(userA, "Hapus", { initialBalance: 1_000 });
    await post({ items: [{ accountId: account, value: 1_500 }] });
    await db
      .update(transactions)
      .set({ deletedAt: new Date() })
      .where(eq(transactions.accountId, account));
    expect((await getValuations()).find((v) => v.accountId === account)).toMatchObject({
      balance: 1_000,
      marketGain: 0,
      contributed: 1_000,
      lastValuedAt: null,
    });
  });

  it("never shows user A's accounts to user B, and B cannot check in A's account", async () => {
    signInAs(userA);
    const aIds = (await getValuations()).map((v) => v.accountId);
    expect(aIds.length).toBeGreaterThan(0);

    signInAs(userB);
    const bIds = (await getValuations()).map((v) => v.accountId);
    expect(bIds.filter((id) => aIds.includes(id))).toEqual([]);
    await expectFieldError(await post({ items: [{ accountId: aIds[0], value: 1 }] }), "items.0");
    const written = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(and(eq(transactions.userId, userB), inArray(transactions.accountId, aIds)));
    expect(written).toEqual([]);
  });
});

describe("without a session", () => {
  it("returns 401 for GET and POST", async () => {
    signInAs(null);
    const get = await route.GET(new Request("http://localhost/api/valuations"), noParams);
    expect(get.status).toBe(401);
    expect((await get.json()).error.code).toBe("UNAUTHORIZED");
    expect((await post({ items: [] })).status).toBe(401);
  });
});

describe("POST /api/accounts with subtype gold", () => {
  it("creates the account", async () => {
    signInAs(userA);
    const res = await accountsRoute.POST(
      new Request("http://localhost/api/accounts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: `Emas ${randomUUID()}`, type: "asset", subtype: "gold" }),
      }),
      noParams,
    );
    expect(res.status).toBe(201);
    expect((await res.json()).subtype).toBe("gold");
  });
});
