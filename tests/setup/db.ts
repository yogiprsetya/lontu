import { randomUUID } from "node:crypto";
import { inArray } from "drizzle-orm";
import { expect } from "vitest";
import { db } from "@/db";
import { users } from "@/db/schema";

/** Creates throwaway users; call the returned cleanup in afterAll (rows cascade). */
export async function createTestUsers(count: number) {
  const rows = Array.from({ length: count }, () => {
    const id = `test-${randomUUID()}`;
    return { id, email: `${id}@example.test` };
  });
  await db.insert(users).values(rows);
  const ids = rows.map((r) => r.id);
  return {
    ids,
    cleanup: () => db.delete(users).where(inArray(users.id, ids)),
  };
}

/** Asserts a query is rejected by Postgres with the given SQLSTATE and constraint. */
export async function expectPgError(
  query: PromiseLike<unknown>,
  code: string,
  constraint?: string,
) {
  const error = await Promise.resolve(query).then(
    () => undefined,
    (e: unknown) => e,
  );
  expect(error, "query should have been rejected").toBeDefined();
  // Drizzle wraps driver errors; the Postgres error is on `cause`.
  const pg = ((error as { cause?: unknown }).cause ?? error) as {
    code?: string;
    constraint_name?: string;
  };
  expect(pg.code).toBe(code);
  if (constraint) expect(pg.constraint_name).toBe(constraint);
}
