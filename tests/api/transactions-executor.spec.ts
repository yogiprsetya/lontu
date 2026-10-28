import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { insertSimple } from "@/lib/server/transactions";
import { createTestUsers } from "../setup/db";

class Rollback extends Error {}

let userId: string;
let cleanup: () => PromiseLike<unknown>;
let accountId: string;
let categoryId: string;

beforeAll(async () => {
  const created = await createTestUsers(1);
  [userId] = created.ids;
  cleanup = created.cleanup;
  const [account] = await db.insert(accounts).values({ userId, name: "BCA", type: "transaction" }).returning({ id: accounts.id });
  const [category] = await db
    .insert(categories)
    .values({ userId, name: "Langganan", kind: "spending", spendingType: "wants" })
    .returning({ id: categories.id });
  accountId = account.id;
  categoryId = category.id;
});

afterAll(async () => {
  await cleanup();
});

describe("insertSimple with an executor", () => {
  it("writes through the caller's DB transaction, so a rollback leaves no row", async () => {
    const id = randomUUID();
    const input = { type: "expense" as const, id, amount: 186_000, date: "2026-10-20", accountId, categoryId, description: null };

    const outcome = await db
      .transaction(async (tx) => {
        const { transaction } = await insertSimple(userId, input, tx);
        expect(transaction).toMatchObject({ id, type: "expense", amount: 186_000 });
        const [visible] = await tx.select({ id: transactions.id }).from(transactions).where(eq(transactions.id, id));
        expect(visible).toEqual({ id });
        throw new Rollback();
      })
      .catch((err: unknown) => err);

    expect(outcome).toBeInstanceOf(Rollback);
    expect(await db.$count(transactions, eq(transactions.id, id))).toBe(0);
  });
});
