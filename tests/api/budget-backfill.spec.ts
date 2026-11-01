import { readFileSync } from "node:fs";
import { join } from "node:path";
import { asc, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { budgetVersions, budgets, categories } from "@/db/schema";
import { todayInJakarta } from "@/lib/date";
import { periodToYearMonth, shiftPeriod } from "@/lib/period";
import { createTestUsers } from "../setup/db";

// The migration touches every user's legacy rows, so it only ever runs in a transaction that
// is rolled back: the shared database keeps no trace of it.
const BACKFILL = readFileSync(
  join(process.cwd(), "drizzle/20261101064412_budget_versions_backfill/migration.sql"),
  "utf8",
);

class Rollback extends Error {}

const M = todayInJakarta().slice(0, 7);
const back = (n: number) => {
  let period = M;
  for (let i = 0; i < n; i++) period = shiftPeriod(period, -1);
  return period;
};
const ym = (period: string) => periodToYearMonth(period);

let userId: string;
let cleanup: () => PromiseLike<unknown>;
let makan: string;
let jajan: string;

beforeAll(async () => {
  const users = await createTestUsers(1);
  [userId] = users.ids;
  cleanup = users.cleanup;
  const rows = await db
    .insert(categories)
    .values([
      { userId, name: "Makan", kind: "spending", spendingType: "needs" },
      { userId, name: "Jajan", kind: "spending", spendingType: "wants" },
    ])
    .returning();
  [makan, jajan] = rows.map((r) => r.id);

  await db.insert(budgets).values([
    { userId, categoryId: makan, ...ym(back(3)), amount: 1_000_000 },
    { userId, categoryId: makan, ...ym(back(2)), amount: 1_200_000 },
    // Soft-deleted: the month counts as "no budget", which makes the gap.
    { userId, categoryId: makan, ...ym(back(1)), amount: 9_999_000, deletedAt: new Date() },
    { userId, categoryId: makan, ...ym(M), amount: 1_300_000 },
    { userId, categoryId: makan, ...ym(shiftPeriod(M, 1)), amount: 7_777_000 },
    { userId, categoryId: jajan, ...ym(back(1)), amount: 300_000 },
  ]);
});

afterAll(() => cleanup());

type Version = typeof budgetVersions.$inferSelect;

/** Runs the migration, reads this user's versions, then rolls everything back. */
async function backfilled(): Promise<Version[]> {
  let rows: Version[] = [];
  await db
    .transaction(async (tx) => {
      await tx.execute(sql.raw(BACKFILL));
      rows = await tx
        .select()
        .from(budgetVersions)
        .where(eq(budgetVersions.userId, userId))
        .orderBy(asc(budgetVersions.name), asc(budgetVersions.year), asc(budgetVersions.month));
      throw new Rollback();
    })
    .catch((err: unknown) => {
      if (!(err instanceof Rollback)) throw err;
    });
  return rows;
}

const shape = (v: Version) => ({
  name: v.name,
  period: `${v.year}-${String(v.month).padStart(2, "0")}`,
  amount: v.amount,
  ended: v.deletedAt !== null,
});

describe("budget_versions backfill", () => {
  it("keeps past months, ends after gaps and in the cutover month, skips deleted and future rows", async () => {
    const rows = await backfilled();
    expect(rows.map(shape)).toEqual([
      { name: "Jajan", period: back(1), amount: 300_000, ended: false },
      { name: "Jajan", period: M, amount: 300_000, ended: true },
      { name: "Makan", period: back(3), amount: 1_000_000, ended: false },
      { name: "Makan", period: back(2), amount: 1_200_000, ended: false },
      { name: "Makan", period: back(1), amount: 1_200_000, ended: true },
      { name: "Makan", period: M, amount: 1_300_000, ended: true },
    ]);
  });

  it("gives each category one budget of its own type", async () => {
    const rows = await backfilled();
    const byName = (name: string) => rows.filter((r) => r.name === name);
    expect(new Set(byName("Makan").map((r) => r.budgetId)).size).toBe(1);
    expect(byName("Makan")[0].budgetId).not.toBe(byName("Jajan")[0].budgetId);
    expect(byName("Makan").every((r) => r.spendingType === "needs")).toBe(true);
    expect(byName("Jajan").every((r) => r.categoryIds.join() === jajan)).toBe(true);
  });

  it("leaves nothing behind", async () => {
    await backfilled();
    const left = await db.select().from(budgetVersions).where(eq(budgetVersions.userId, userId));
    expect(left).toEqual([]);
  });
});
