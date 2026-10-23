import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories } from "@/db/schema";
import type { CategoryKind } from "@/lib/schemas/category";

// Both helpers return archived rows too: whether an archived reference is allowed
// depends on create vs edit, which only the calling module knows.

/** The subset of `ids` owned by `userId`. Unknown or foreign ids are left out. */
export async function findOwnedAccounts(userId: string, ids: string[]) {
  if (ids.length === 0) return [];
  return db
    .select({ id: accounts.id, archivedAt: accounts.archivedAt })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), inArray(accounts.id, ids)));
}

export async function findOwnedCategory(userId: string, id: string) {
  const [row] = await db
    .select({ id: categories.id, kind: categories.kind, archivedAt: categories.archivedAt })
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.id, id)));
  return row && { ...row, kind: row.kind as CategoryKind };
}
