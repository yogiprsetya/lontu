import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { users } from "@/db/schema";
import { upsertUser } from "@/lib/server/users";

const id = `test-${randomUUID()}`;

afterAll(async () => {
  await db.delete(users).where(eq(users.id, id));
});

describe("upsertUser", () => {
  it("creates the user on first login", async () => {
    await upsertUser({ id, email: `${id}@example.test`, name: "Yogi", image: "https://img/1" });

    const rows = await db.select().from(users).where(eq(users.id, id));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: `${id}@example.test`, displayName: "Yogi", image: "https://img/1", currency: "IDR" });
  });

  it("does not duplicate on a second login and refreshes email and image only", async () => {
    await db.update(users).set({ displayName: "Edited in app" }).where(eq(users.id, id));

    await upsertUser({ id, email: `new-${id}@example.test`, name: "Google Name", image: "https://img/2" });

    const rows = await db.select().from(users).where(eq(users.id, id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: `new-${id}@example.test`,
      displayName: "Edited in app",
      image: "https://img/2",
    });
  });
});
