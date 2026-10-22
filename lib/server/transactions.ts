import "server-only";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { CATEGORY_KIND_FOR, type CategoryKind } from "@/lib/schemas/category";
import type {
  ListTransactionType,
  Transaction,
  TransactionCreated,
  TransactionCreateInput,
} from "@/lib/schemas/transaction";
import { findOwnedAccounts, findOwnedCategory } from "@/lib/server/ownership";

type Row = typeof transactions.$inferSelect;

/** A referenced id that failed the ownership/active/kind check, reported on one body field. */
export type InvalidReference = { field: "accountId" | "toAccountId" | "categoryId" | "fee"; message: string };

type TransferInput = Extract<TransactionCreateInput, { type: "transfer" }>;
type SimpleInput = Exclude<TransactionCreateInput, TransferInput>;

const FEE_DESCRIPTION = "Biaya admin transfer";

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
async function checkAccounts(userId: string, fields: Partial<Record<"accountId" | "toAccountId", string>>) {
  const owned = await findOwnedAccounts(userId, Object.values(fields));
  for (const [field, id] of Object.entries(fields) as ["accountId" | "toAccountId", string][]) {
    const account = owned.find((a) => a.id === id);
    if (!account) return { field, message: "Akun tidak ditemukan" };
    if (account.archivedAt) return { field, message: "Akun sudah diarsipkan" };
  }
}

async function checkCategory(
  userId: string,
  id: string,
  kind: CategoryKind,
  field: "categoryId" | "fee",
): Promise<InvalidReference | undefined> {
  const category = await findOwnedCategory(userId, id);
  if (!category) return { field, message: "Kategori tidak ditemukan" };
  if (category.archivedAt) return { field, message: "Kategori sudah diarsipkan" };
  if (category.kind !== kind) return { field, message: "Kategori tidak sesuai dengan jenis transaksi" };
}

async function checkReferences(userId: string, input: TransactionCreateInput): Promise<InvalidReference | undefined> {
  if (input.type !== "transfer") {
    const [account, category] = await Promise.all([
      checkAccounts(userId, { accountId: input.accountId }),
      checkCategory(userId, input.categoryId, CATEGORY_KIND_FOR[input.type], "categoryId"),
    ]);
    return account ?? category;
  }
  const [accounts, fee] = await Promise.all([
    checkAccounts(userId, { accountId: input.accountId, toAccountId: input.toAccountId }),
    input.fee && checkCategory(userId, input.fee.categoryId, "spending", "fee"),
  ]);
  return accounts ?? fee;
}

async function insertSimple(userId: string, input: SimpleInput): Promise<TransactionCreated> {
  const [row] = await db
    .insert(transactions)
    .values({ userId, ...input })
    .returning();
  return { transaction: toTransaction(row), fee: null };
}

async function insertTransfer(userId: string, { fee, ...input }: TransferInput): Promise<TransactionCreated> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(transactions)
      .values({ userId, ...input })
      .returning();
    if (!fee) return { transaction: toTransaction(row), fee: null };

    const [feeRow] = await tx
      .insert(transactions)
      .values({
        userId,
        type: "expense",
        amount: fee.amount,
        date: input.date,
        accountId: input.accountId,
        categoryId: fee.categoryId,
        description: FEE_DESCRIPTION,
      })
      .returning();
    return { transaction: toTransaction(row), fee: toTransaction(feeRow) };
  });
}

export async function createTransaction(
  userId: string,
  input: TransactionCreateInput,
): Promise<TransactionCreated | { invalid: InvalidReference }> {
  const invalid = await checkReferences(userId, input);
  if (invalid) return { invalid };
  return input.type === "transfer" ? insertTransfer(userId, input) : insertSimple(userId, input);
}
