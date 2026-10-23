import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { categories, users } from "@/db/schema";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import { upsertUser } from "@/lib/server/users";
import { createTestUsers } from "../setup/db";

const created: string[] = [];

function newIdentity() {
  const id = `test-${randomUUID()}`;
  created.push(id);
  return { id, email: `${id}@example.test`, name: "Test" };
}

function categoriesOf(userId: string) {
  return db
    .select({ name: categories.name, kind: categories.kind, spendingType: categories.spendingType })
    .from(categories)
    .where(eq(categories.userId, userId));
}

afterAll(async () => {
  if (created.length) await db.delete(users).where(inArray(users.id, created));
});

describe("default category seeding in upsertUser", () => {
  it("seeds the 16 default categories on first login and not again on the second", async () => {
    const identity = newIdentity();

    await upsertUser(identity);
    await upsertUser(identity);

    const rows = await categoriesOf(identity.id);
    expect(rows).toHaveLength(16);
    expect(rows).toEqual(expect.arrayContaining([...DEFAULT_CATEGORIES]));
  });

  it("seeds an existing user who has no categories yet", async () => {
    const { ids, cleanup } = await createTestUsers(1);
    try {
      await upsertUser({ id: ids[0], email: `${ids[0]}@example.test` });

      expect(await categoriesOf(ids[0])).toHaveLength(16);
    } finally {
      await cleanup();
    }
  });

  it("does not re-seed a user whose categories are all archived", async () => {
    const identity = newIdentity();
    await upsertUser(identity);
    await db.update(categories).set({ archivedAt: new Date() }).where(eq(categories.userId, identity.id));

    await upsertUser(identity);

    expect(await categoriesOf(identity.id)).toHaveLength(16);
  });

  it("produces exactly 16 rows when two logins race", async () => {
    const identity = newIdentity();

    await Promise.all([upsertUser(identity), upsertUser(identity)]);

    expect(await categoriesOf(identity.id)).toHaveLength(16);
  });
});
