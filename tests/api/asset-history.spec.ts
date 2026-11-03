import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import type { AssetHistory } from "@/lib/schemas/asset-history";
import { assetHistory } from "@/lib/server/queries/asset-history";
import { assetValuations } from "@/lib/server/queries/asset-valuations";
import { createTestUsers } from "../setup/db";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const route = await import("@/app/api/valuations/history/route");
const mockedAuth = vi.mocked(auth as unknown as () => Promise<unknown>);

function signInAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

function get(query = "") {
  return route.GET(new Request(`http://localhost/api/valuations/history${query}`), {
    params: Promise.resolve({}),
  });
}

const today = "2026-11-15";
const cleanups: (() => PromiseLike<unknown>)[] = [];

afterAll(async () => {
  for (const cleanup of cleanups) await cleanup();
});

async function newUser() {
  const users = await createTestUsers(1);
  cleanups.push(users.cleanup);
  return users.ids[0];
}

async function account(
  userId: string,
  name: string,
  values: Partial<typeof accounts.$inferInsert> = {},
) {
  const [row] = await db
    .insert(accounts)
    .values({
      userId,
      name: `${name} ${randomUUID()}`,
      type: "asset",
      createdAt: new Date("2026-07-01T03:00:00Z"),
      ...values,
    })
    .returning({ id: accounts.id });
  return row.id;
}

type Row = Omit<typeof transactions.$inferInsert, "userId">;

async function insertTransactions(userId: string, rows: Row[]) {
  return db
    .insert(transactions)
    .values(rows.map((r) => ({ ...r, userId })))
    .returning({ id: transactions.id });
}

const transfer = (from: string, to: string, amount: number, date: string): Row => ({
  type: "transfer",
  amount,
  date,
  accountId: from,
  toAccountId: to,
});

const revaluation = (accountId: string, amount: number, date: string): Row => ({
  type: "revaluation",
  amount,
  date,
  accountId,
});

/** SPEC-asset-history § Acceptance criteria. */
async function baseScenario() {
  const userId = await newUser();
  const bca = await account(userId, "BCA", { type: "transaction", subtype: "debit" });
  const emas = await account(userId, "Emas", { subtype: "gold", initialBalance: 30_000_000 });
  const reksadana = await account(userId, "RD Saham", { subtype: "investment" });
  const ids = await insertTransactions(userId, [
    transfer(bca, reksadana, 3_000_000, "2026-08-05"),
    transfer(bca, reksadana, 4_000_000, "2026-09-05"),
    revaluation(reksadana, -300_000, "2026-09-30"),
    transfer(bca, emas, 5_000_000, "2026-10-05"),
    transfer(reksadana, emas, 1_000_000, "2026-10-10"),
    revaluation(emas, 500_000, "2026-10-31"),
    revaluation(reksadana, 200_000, "2026-11-02"),
  ]);
  return { userId, bca, emas, reksadana, emasRevaluation: ids[5].id };
}

/** month, value, contributed, marketGain, contributionChange, marketChange */
function table(history: AssetHistory | null) {
  return history!.months.map((m) => [
    m.month,
    m.value,
    m.contributed,
    m.marketGain,
    m.contributionChange,
    m.marketChange,
  ]);
}

const zero = { value: 0, contributed: 0, marketGain: 0 };

describe("assetHistory", () => {
  let base: Awaited<ReturnType<typeof baseScenario>>;

  beforeAll(async () => {
    base = await baseScenario();
  });

  it("combines every active asset account from its first month, range 12", async () => {
    const history = await assetHistory(base.userId, { range: "12", accountId: null, today });
    expect(history).toMatchObject({ range: "12", accountId: null, opening: zero });
    expect(table(history)).toEqual([
      ["2026-07", 30_000_000, 30_000_000, 0, 30_000_000, 0],
      ["2026-08", 33_000_000, 33_000_000, 0, 3_000_000, 0],
      ["2026-09", 36_700_000, 37_000_000, -300_000, 4_000_000, -300_000],
      ["2026-10", 42_200_000, 42_000_000, 200_000, 5_000_000, 500_000],
      ["2026-11", 42_400_000, 42_000_000, 400_000, 0, 200_000],
    ]);
  });

  it("follows one account, a transfer between assets counting as a contribution", async () => {
    const history = await assetHistory(base.userId, {
      range: "12",
      accountId: base.reksadana,
      today,
    });
    expect(history).toMatchObject({ accountId: base.reksadana, opening: zero });
    expect(table(history)).toEqual([
      ["2026-07", 0, 0, 0, 0, 0],
      ["2026-08", 3_000_000, 3_000_000, 0, 3_000_000, 0],
      ["2026-09", 6_700_000, 7_000_000, -300_000, 4_000_000, -300_000],
      ["2026-10", 5_700_000, 6_000_000, -300_000, -1_000_000, 0],
      ["2026-11", 5_900_000, 6_000_000, -100_000, 0, 200_000],
    ]);
  });

  it("cuts range 6 to the last six months, opening at the month before", async () => {
    const history = await assetHistory(base.userId, {
      range: "6",
      accountId: null,
      today: "2027-01-15",
    });
    expect(history!.opening).toEqual({
      value: 30_000_000,
      contributed: 30_000_000,
      marketGain: 0,
    });
    expect(table(history)).toEqual([
      ["2026-08", 33_000_000, 33_000_000, 0, 3_000_000, 0],
      ["2026-09", 36_700_000, 37_000_000, -300_000, 4_000_000, -300_000],
      ["2026-10", 42_200_000, 42_000_000, 200_000, 5_000_000, 500_000],
      ["2026-11", 42_400_000, 42_000_000, 400_000, 0, 200_000],
      ["2026-12", 42_400_000, 42_000_000, 400_000, 0, 0],
      ["2027-01", 42_400_000, 42_000_000, 400_000, 0, 0],
    ]);
  });

  it("returns the same months for range all as for range 12 here", async () => {
    const all = await assetHistory(base.userId, { range: "all", accountId: null, today });
    const twelve = await assetHistory(base.userId, { range: "12", accountId: null, today });
    expect(all).toEqual({ ...twelve, range: "all" });
  });

  it("returns null for an account that is not one of the user's active assets", async () => {
    const other = await baseScenario();
    for (const accountId of [base.bca, randomUUID(), other.emas]) {
      expect(await assetHistory(base.userId, { range: "12", accountId, today })).toBeNull();
    }
  });

  describe("invariants", () => {
    it("ends at the current asset valuations, combined and per account", async () => {
      const valuations = await assetValuations(base.userId);
      const sum = (key: "balance" | "contributed" | "marketGain") =>
        valuations.reduce((total, v) => total + v[key], 0);
      const combined = await assetHistory(base.userId, { range: "12", accountId: null, today });
      expect(combined!.months.at(-1)).toMatchObject({
        value: sum("balance"),
        contributed: sum("contributed"),
        marketGain: sum("marketGain"),
      });
      for (const v of valuations) {
        const one = await assetHistory(base.userId, { range: "12", accountId: v.accountId, today });
        expect(one!.months.at(-1)).toMatchObject({
          value: v.balance,
          contributed: v.contributed,
          marketGain: v.marketGain,
        });
      }
    });

    it("keeps value = contributed + marketGain and combined = the sum per account", async () => {
      const combined = await assetHistory(base.userId, { range: "all", accountId: null, today });
      const perAccount = await Promise.all(
        [base.emas, base.reksadana].map((accountId) =>
          assetHistory(base.userId, { range: "all", accountId, today }),
        ),
      );
      for (const month of combined!.months) {
        expect(month.value).toBe(month.contributed + month.marketGain);
        const same = perAccount.map((h) => h!.months.find((m) => m.month === month.month));
        expect(same.reduce((total, m) => total + (m?.value ?? 0), 0)).toBe(month.value);
        expect(same.reduce((total, m) => total + (m?.marketGain ?? 0), 0)).toBe(month.marketGain);
      }
    });
  });
});

describe("assetHistory edge cases", () => {
  it("starts a backdated account at its oldest transaction with the opening balance", async () => {
    const userId = await newUser();
    const bca = await account(userId, "BCA", { type: "transaction", subtype: "debit" });
    const saham = await account(userId, "Saham", {
      initialBalance: 2_000_000,
      createdAt: new Date("2026-11-01T03:00:00Z"),
    });
    await insertTransactions(userId, [transfer(bca, saham, 1_000_000, "2026-09-10")]);
    const history = await assetHistory(userId, { range: "12", accountId: null, today });
    expect(table(history)).toEqual([
      ["2026-09", 3_000_000, 3_000_000, 0, 3_000_000, 0],
      ["2026-10", 3_000_000, 3_000_000, 0, 0, 0],
      ["2026-11", 3_000_000, 3_000_000, 0, 0, 0],
    ]);
  });

  it("dates the first month by created_at in Asia/Jakarta", async () => {
    const userId = await newUser();
    // 2026-06-30 18:00 UTC is 2026-07-01 01:00 WIB.
    await account(userId, "Emas", {
      initialBalance: 1_000_000,
      createdAt: new Date("2026-06-30T18:00:00Z"),
    });
    const history = await assetHistory(userId, { range: "12", accountId: null, today });
    expect(history!.months[0].month).toBe("2026-07");
  });

  it("ignores a soft-deleted revaluation", async () => {
    const { userId, emasRevaluation } = await baseScenario();
    await db
      .update(transactions)
      .set({ deletedAt: new Date() })
      .where(and(eq(transactions.id, emasRevaluation), eq(transactions.userId, userId)));
    const history = await assetHistory(userId, { range: "12", accountId: null, today });
    expect(history!.months.slice(-2).map((m) => [m.month, m.marketGain, m.value])).toEqual([
      ["2026-10", -300_000, 41_700_000],
      ["2026-11", -100_000, 41_900_000],
    ]);
  });

  it("leaves an archived account out of every month and treats its id as not found", async () => {
    const { userId, emas } = await baseScenario();
    await db.update(accounts).set({ archivedAt: new Date() }).where(eq(accounts.id, emas));
    const history = await assetHistory(userId, { range: "12", accountId: null, today });
    expect(table(history).map((row) => [row[0], row[1]])).toEqual([
      ["2026-07", 0],
      ["2026-08", 3_000_000],
      ["2026-09", 6_700_000],
      ["2026-10", 5_700_000],
      ["2026-11", 5_900_000],
    ]);
    expect(await assetHistory(userId, { range: "12", accountId: emas, today })).toBeNull();
  });

  it("returns no months for a user without an active asset account", async () => {
    const userId = await newUser();
    await account(userId, "BCA", { type: "transaction", subtype: "debit", initialBalance: 100 });
    expect(await assetHistory(userId, { range: "12", accountId: null, today })).toEqual({
      range: "12",
      accountId: null,
      opening: zero,
      months: [],
    });
  });
});

describe("GET /api/valuations/history", () => {
  async function expectNotFound(res: Response) {
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("ACCOUNT_NOT_FOUND");
  }

  async function expectFieldError(res: Response, field: string) {
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.fields[field]).toBeDefined();
  }

  it("defaults to range 12, combined", async () => {
    const { userId } = await baseScenario();
    signInAs(userId);
    const res = await get();
    expect(res.status).toBe(200);
    const body = (await res.json()) as AssetHistory;
    expect(body).toMatchObject({ range: "12", accountId: null });
    expect(body.months[0]).toMatchObject({ month: "2026-07", value: 30_000_000 });
  });

  it("filters by an asset account", async () => {
    const { userId, reksadana } = await baseScenario();
    signInAs(userId);
    const res = await get(`?range=all&accountId=${reksadana}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as AssetHistory;
    expect(body).toMatchObject({ range: "all", accountId: reksadana });
    expect(body.months.slice(0, 2).map((m) => m.value)).toEqual([0, 3_000_000]);
  });

  it("rejects an unknown range or a non-uuid accountId with 400", async () => {
    signInAs(await newUser());
    await expectFieldError(await get("?range=24"), "range");
    await expectFieldError(await get("?accountId=abc"), "accountId");
  });

  it("answers 404 for a transaction account, an archived asset, or a random id", async () => {
    const { userId, bca, emas } = await baseScenario();
    await db.update(accounts).set({ archivedAt: new Date() }).where(eq(accounts.id, emas));
    signInAs(userId);
    for (const accountId of [bca, emas, randomUUID()]) {
      await expectNotFound(await get(`?accountId=${accountId}`));
    }
  });

  it("isolates users: B cannot read A's asset, and A's data leaves B's history alone", async () => {
    const a = await baseScenario();
    const userB = await newUser();
    await account(userB, "Tabungan Emas", { initialBalance: 1_000_000 });
    signInAs(userB);
    await expectNotFound(await get(`?accountId=${a.emas}`));
    const body = (await (await get("?range=all")).json()) as AssetHistory;
    expect(body.months.length).toBeGreaterThan(0);
    expect(body.months.every((m) => m.value === 1_000_000 && m.marketGain === 0)).toBe(true);
  });

  it("returns 401 without a session", async () => {
    signInAs(null);
    const res = await get();
    expect(res.status).toBe(401);
    expect((await res.json()).error.code).toBe("UNAUTHORIZED");
  });
});
