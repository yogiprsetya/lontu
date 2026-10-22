import "server-only";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { CATEGORY_KIND_FOR } from "@/lib/schemas/category";
import type {
  ListTransactionType,
  Transaction,
  TransactionCreated,
  TransactionCreateInput,
} from "@/lib/schemas/transaction";
import { findOwnedAccounts, findOwnedCategory } from "@/lib/server/ownership";

type Row = typeof transactions.$inferSelect;

/** A referenced id that failed the ownership/active/kind check, reported on one body field. */
export type InvalidReference = { field: "accountId" | "categoryId"; message: string };

function toTransaction(row: Row): Transaction {
  return {
    id: row.id,
    type: row.type as ListTransactionType,
    amount: row.amount,
    date: row.date,
    accountId: row.accountId,
    toAccountId: row.toAccountId,
    categoryId: row.categoryId,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}

// Foreign and unknown ids share one message so a response never reveals another user's data.
async function checkReferences(userId: string, input: TransactionCreateInput): Promise<InvalidReference | undefined> {
  const [[account], category] = await Promise.all([
    findOwnedAccounts(userId, [input.accountId]),
    findOwnedCategory(userId, input.categoryId),
  ]);
  if (!account) return { field: "accountId", message: "Akun tidak ditemukan" };
  if (account.archivedAt) return { field: "accountId", message: "Akun sudah diarsipkan" };
  if (!category) return { field: "categoryId", message: "Kategori tidak ditemukan" };
  if (category.archivedAt) return { field: "categoryId", message: "Kategori sudah diarsipkan" };
  if (category.kind !== CATEGORY_KIND_FOR[input.type]) {
    return { field: "categoryId", message: "Kategori tidak sesuai dengan jenis transaksi" };
  }
}

export async function createTransaction(
  userId: string,
  input: TransactionCreateInput,
): Promise<TransactionCreated | { invalid: InvalidReference }> {
  const invalid = await checkReferences(userId, input);
  if (invalid) return { invalid };

  const [row] = await db
    .insert(transactions)
    .values({ userId, ...input })
    .returning();
  return { transaction: toTransaction(row), fee: null };
}
