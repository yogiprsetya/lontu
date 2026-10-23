import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { accounts, categories } from "@/db/schema";
import { findOwnedAccounts, findOwnedCategory } from "@/lib/server/ownership";
import { createTestUsers } from "../setup/db";

let userA: string;
let userB: string;
let cleanup: () => PromiseLike<unknown>;
let a1: string;
let a2: string;
let b1: string;
let categoryA: string;
let categoryB: string;
const archivedAt = new Date("2026-10-01T00:00:00Z");

beforeAll(async () => {
  const created = await createTestUsers(2);
  [userA, userB] = created.ids;
  cleanup = created.cleanup;

  [{ id: a1 }, { id: a2 }, { id: b1 }] = await db
    .insert(accounts)
    .values([
      { userId: userA, name: "A1", type: "transaction" },
      { userId: userA, name: "A2", type: "asset", archivedAt },
      { userId: userB, name: "B1", type: "transaction" },
    ])
    .returning({ id: accounts.id });
  [{ id: categoryA }, { id: categoryB }] = await db
    .insert(categories)
    .values([
      { userId: userA, name: "Makan", kind: "spending", spendingType: "needs" },
      { userId: userB, name: "Gaji", kind: "income" },
    ])
    .returning({ id: categories.id });
});

afterAll(async () => {
  await cleanup();
});

describe("findOwnedAccounts", () => {
  it("returns only the user's accounts, archived included, and skips unknown ids", async () => {
    const rows = await findOwnedAccounts(userA, [a1, a2, b1, randomUUID()]);

    expect(rows).toHaveLength(2);
    expect(rows).toEqual(
      expect.arrayContaining([
        { id: a1, archivedAt: null },
        { id: a2, archivedAt },
      ]),
    );
  });

  it("returns an empty list for no ids", async () => {
    expect(await findOwnedAccounts(userA, [])).toEqual([]);
  });
});

describe("findOwnedCategory", () => {
  it("returns id, kind and archivedAt for the user's own category", async () => {
    expect(await findOwnedCategory(userA, categoryA)).toEqual({ id: categoryA, kind: "spending", archivedAt: null });
  });

  it("returns undefined for another user's category", async () => {
    expect(await findOwnedCategory(userA, categoryB)).toBeUndefined();
  });
});
