import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { accounts, categories, goals, transactions } from "@/db/schema";
import { listAccounts } from "@/lib/server/accounts";
import { assetValuations } from "@/lib/server/queries/asset-valuations";
import { goalProgress } from "@/lib/server/queries/goal-progress";
import { createTestUsers } from "../setup/db";

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

async function goal(userId: string, values: Partial<typeof goals.$inferInsert> = {}) {
  const [row] = await db
    .insert(goals)
    .values({
      userId,
      name: `Target ${randomUUID()}`,
      targetAmount: 150_000_000,
      accountIds: [],
      ...values,
    })
    .returning({ id: goals.id });
  return row.id;
}

type Row = Omit<typeof transactions.$inferInsert, "userId">;

async function insertTransactions(userId: string, rows: Row[]) {
  await db.insert(transactions).values(rows.map((r) => ({ ...r, userId })));
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

/** SPEC-goals § Acceptance criteria, after the 2026-10-31 check-in. */
async function baseScenario() {
  const userId = await newUser();
  const bca = await account(userId, "BCA", { type: "transaction", subtype: "debit" });
  const emas = await account(userId, "Emas", { subtype: "gold", initialBalance: 30_000_000 });
  const reksadana = await account(userId, "RD Saham", { subtype: "investment" });
  await insertTransactions(userId, [
    transfer(bca, reksadana, 3_000_000, "2026-08-10"),
    transfer(bca, reksadana, 4_000_000, "2026-09-10"),
    transfer(bca, emas, 5_000_000, "2026-10-10"),
    transfer(reksadana, emas, 1_000_000, "2026-10-20"),
    revaluation(emas, 500_000, "2026-10-31"),
    revaluation(reksadana, 200_000, "2026-10-31"),
  ]);
  const dpRumah = await goal(userId, {
    name: "DP Rumah",
    targetYear: 2028,
    targetMonth: 12,
    accountIds: [emas, reksadana],
  });
  return { userId, bca, emas, reksadana, dpRumah };
}

async function progressOf(userId: string, goalId: string, includeArchived = false) {
  return (await goalProgress(userId, { today, includeArchived })).find((g) => g.id === goalId)!;
}

describe("goalProgress", () => {
  it("computes the SPEC-goals base scenario", async () => {
    const { userId, emas, reksadana, dpRumah } = await baseScenario();
    expect(await progressOf(userId, dpRumah)).toMatchObject({
      id: dpRumah,
      name: "DP Rumah",
      targetAmount: 150_000_000,
      targetMonth: "2028-12",
      accountIds: [emas, reksadana],
      archivedAt: null,
      current: 42_700_000,
      marketGain: 700_000,
      contributed: 42_000_000,
      staleAccountIds: [],
      projection: {
        remaining: 107_300_000,
        reached: false,
        monthlyContribution: 4_000_000,
        etaMonth: "2029-01",
        monthsLeft: 26,
        neededPerMonth: 4_126_924,
        overdue: false,
        onTrack: false,
      },
    });
  });

  it("moves the rate between two goals for a transfer from one to the other", async () => {
    const { userId, bca, dpRumah } = await baseScenario();
    const darurat = await goal(userId, { name: "Dana Darurat", accountIds: [bca] });
    expect((await progressOf(userId, dpRumah)).projection.monthlyContribution).toBe(4_000_000);
    expect(await progressOf(userId, darurat)).toMatchObject({
      targetMonth: null,
      current: -12_000_000,
      projection: { monthlyContribution: -4_000_000, etaMonth: null, onTrack: null },
    });
  });

  it("leaves adjustments and revaluations out of the rate, but not out of current", async () => {
    const { userId, reksadana, dpRumah } = await baseScenario();
    await insertTransactions(userId, [
      { type: "adjustment", amount: 2_000_000, date: "2026-09-15", accountId: reksadana },
      revaluation(reksadana, -300_000, "2026-08-31"),
    ]);
    expect(await progressOf(userId, dpRumah)).toMatchObject({
      current: 44_400_000,
      marketGain: 400_000,
      contributed: 44_000_000,
      projection: { monthlyContribution: 4_000_000 },
    });
  });

  it("counts income, expense and saving on a goal account in the rate", async () => {
    const userId = await newUser();
    const tabungan = await account(userId, "Tabungan", { type: "transaction" });
    const id = await goal(userId, { accountIds: [tabungan] });
    const [income, spending, saving] = await db
      .insert(categories)
      .values([
        { userId, name: "Gaji", kind: "income" },
        { userId, name: "Makan", kind: "spending", spendingType: "needs" },
        { userId, name: "Investasi", kind: "saving" },
      ])
      .returning({ id: categories.id });
    const on = (categoryId: string, type: string, amount: number, date: string): Row => ({
      type,
      amount,
      date,
      accountId: tabungan,
      categoryId,
    });
    await insertTransactions(userId, [
      on(income.id, "income", 9_000_000, "2026-08-25"),
      on(spending.id, "expense", 1_500_000, "2026-09-02"),
      on(saving.id, "saving", 1_500_000, "2026-10-02"),
      on(income.id, "income", 1_000_000, "2026-11-01"),
      on(income.id, "income", 1_000_000, "2026-07-31"),
    ]);
    expect((await progressOf(userId, id)).projection.monthlyContribution).toBe(2_000_000);
  });

  it("drops an archived account from current, marketGain and the rate, but keeps its id", async () => {
    const { userId, emas, reksadana, dpRumah } = await baseScenario();
    await db.update(accounts).set({ archivedAt: new Date() }).where(eq(accounts.id, reksadana));
    expect(await progressOf(userId, dpRumah)).toMatchObject({
      accountIds: [emas, reksadana],
      current: 36_500_000,
      marketGain: 500_000,
      contributed: 36_000_000,
      // Oktober: 5 jt from BCA and 1 jt from the now-uncounted RD Saham.
      projection: { monthlyContribution: 2_000_000 },
    });
  });

  it("divides by the months since the oldest account was created, in Jakarta time", async () => {
    const userId = await newUser();
    // 00:30 on 1 October in Jakarta.
    const october = await account(userId, "Baru", {
      createdAt: new Date("2026-09-30T17:30:00Z"),
    });
    const source = await account(userId, "Sumber", { type: "transaction" });
    const id = await goal(userId, { accountIds: [october] });
    await insertTransactions(userId, [transfer(source, october, 2_000_000, "2026-10-05")]);
    expect((await progressOf(userId, id)).projection.monthlyContribution).toBe(2_000_000);
  });

  it("has no rate when every account was created this month", async () => {
    const userId = await newUser();
    const fresh = await account(userId, "Bulan ini", {
      createdAt: new Date("2026-11-03T03:00:00Z"),
    });
    const id = await goal(userId, { accountIds: [fresh], targetYear: 2027, targetMonth: 6 });
    expect((await progressOf(userId, id)).projection).toMatchObject({
      monthlyContribution: null,
      etaMonth: null,
      onTrack: null,
      monthsLeft: 8,
    });
  });

  it("marks an old goal whose target month has passed as overdue, needing the whole remainder", async () => {
    const { userId, dpRumah } = await baseScenario();
    await db.update(goals).set({ targetYear: 2026, targetMonth: 10 }).where(eq(goals.id, dpRumah));
    expect((await progressOf(userId, dpRumah)).projection).toMatchObject({
      overdue: true,
      monthsLeft: 0,
      neededPerMonth: 107_300_000,
      onTrack: false,
    });
  });

  it("lists asset accounts never valued or valued more than 35 days ago as stale", async () => {
    const userId = await newUser();
    const never = await account(userId, "Belum");
    const old = await account(userId, "Lama");
    const fresh = await account(userId, "Segar");
    const cash = await account(userId, "Kas", { type: "transaction" });
    await insertTransactions(userId, [
      revaluation(old, 1_000, "2026-10-10"),
      revaluation(fresh, 1_000, "2026-10-11"),
    ]);
    const id = await goal(userId, { accountIds: [fresh, cash, old, never] });
    expect((await progressOf(userId, id)).staleAccountIds).toEqual([old, never]);
  });

  it("current equals the sum of GET /api/accounts balances of the goal's active accounts", async () => {
    const { userId, emas, reksadana, dpRumah } = await baseScenario();
    const balances = await listAccounts(userId);
    const sum = balances
      .filter((a) => [emas, reksadana].includes(a.id))
      .reduce((total, a) => total + a.balance, 0);
    expect((await progressOf(userId, dpRumah)).current).toBe(sum);
  });

  it("lists active goals by created_at, and archived ones only on request", async () => {
    const userId = await newUser();
    const a = await account(userId, "A");
    const b = await account(userId, "B");
    const first = await goal(userId, { accountIds: [a], createdAt: new Date("2026-10-01") });
    const archived = await goal(userId, {
      accountIds: [b],
      createdAt: new Date("2026-10-02"),
      archivedAt: new Date(),
    });
    const second = await goal(userId, { accountIds: [b], createdAt: new Date("2026-10-03") });

    const active = await goalProgress(userId, { today });
    expect(active.map((g) => g.id)).toEqual([first, second]);
    const all = await goalProgress(userId, { today, includeArchived: true });
    expect(all.map((g) => g.id)).toEqual([first, archived, second]);
    expect(all[1].archivedAt).not.toBeNull();
  });

  it("never reads another user's goals or accounts", async () => {
    const { userId: userA, emas, dpRumah } = await baseScenario();
    const userB = await newUser();
    const smuggled = await goal(userB, { accountIds: [emas] });

    const forB = await goalProgress(userB, { today, includeArchived: true });
    expect(forB.map((g) => g.id)).toEqual([smuggled]);
    expect(forB[0]).toMatchObject({ current: 0, marketGain: 0, staleAccountIds: [] });
    expect((await goalProgress(userA, { today })).map((g) => g.id)).toEqual([dpRumah]);
  });
});

describe("assetValuations goalId", () => {
  it("names the active goal that counts each asset account", async () => {
    const { userId, emas, reksadana, dpRumah } = await baseScenario();
    const other = await account(userId, "Lepas");
    await goal(userId, { accountIds: [other], archivedAt: new Date() });

    const byId = new Map((await assetValuations(userId)).map((v) => [v.accountId, v.goalId]));
    expect(byId.get(emas)).toBe(dpRumah);
    expect(byId.get(reksadana)).toBe(dpRumah);
    expect(byId.get(other)).toBeNull();
  });
});
