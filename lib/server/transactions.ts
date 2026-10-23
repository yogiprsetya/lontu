import "server-only";
import { z } from "zod";
import { and, desc, eq, getTableColumns, gte, isNotNull, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import { CATEGORY_KIND_FOR, type CategoryKind } from "@/lib/schemas/category";
import {
  type ListTransactionType,
  SimpleCreateInput,
  Transaction,
  TransactionCreated,
  TransactionFilters,
  TransactionPage,
  TransactionUpdateInput,
  TransactionCreateInput,
  TransferCreateInput,
  transactionUpdateSchema,
} from "@/lib/schemas/transaction";
import type { TransactionType } from "@/lib/transaction-types";
import { decodeCursor, encodeCursor, type CursorKey } from "@/lib/server/transaction-cursor";
import { findOwnedAccounts, findOwnedCategory } from "@/lib/server/ownership";

type Row = typeof transactions.$inferSelect;

/** A referenced id that failed the ownership/active/kind check, reported on one body field. */
export type InvalidReference = { field: "accountId" | "toAccountId" | "categoryId" | "fee"; message: string };

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

async function insertSimple(userId: string, input: SimpleCreateInput): Promise<TransactionCreated> {
  const [row] = await db
    .insert(transactions)
    .values({ userId, ...input })
    .returning();
  return { transaction: toTransaction(row), fee: null };
}

async function insertTransfer(userId: string, { fee, ...input }: TransferCreateInput): Promise<TransactionCreated> {
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

// Computed in SQL: a JS Date keeps only milliseconds, so keyset paging on it skips or repeats
// rows whose created_at differ by microseconds.
const createdAtMicros = sql<string>`(extract(epoch from ${transactions.createdAt}) * 1000000)::bigint`;

/** The one `where` for list, totals and export, so the three always see the same rows. */
export function transactionWhere(userId: string, filters: TransactionFilters) {
  return and(
    eq(transactions.userId, userId),
    isNull(transactions.deletedAt),
    filters.type ? eq(transactions.type, filters.type) : undefined,
    filters.accountId
      ? or(eq(transactions.accountId, filters.accountId), eq(transactions.toAccountId, filters.accountId))
      : undefined,
    filters.categoryId ? eq(transactions.categoryId, filters.categoryId) : undefined,
    filters.from ? gte(transactions.date, filters.from) : undefined,
    filters.to ? lte(transactions.date, filters.to) : undefined,
  );
}

export type ListOptions = TransactionFilters & { cursor?: string; limit: number };

/** `{ invalidCursor: true }` when the cursor cannot be decoded. */
export async function listTransactions(
  userId: string,
  { cursor, limit, ...filters }: ListOptions,
): Promise<TransactionPage | { invalidCursor: true }> {
  const key = cursor === undefined ? undefined : decodeCursor(cursor);
  if (key === null) return { invalidCursor: true };

  const rows = await db
    .select({ ...getTableColumns(transactions), micros: createdAtMicros })
    .from(transactions)
    .where(
      and(
        transactionWhere(userId, filters),
        key &&
          sql`(${transactions.date}, ${createdAtMicros}, ${transactions.id}) < (${key.date}::date, ${key.createdAtMicros}::bigint, ${key.id}::uuid)`,
      ),
    )
    .orderBy(desc(transactions.date), desc(transactions.createdAt), desc(transactions.id))
    .limit(limit + 1);

  const page = rows.slice(0, limit);
  const last = page.at(-1);
  const nextKey: CursorKey | undefined =
    rows.length > limit && last ? { date: last.date, createdAtMicros: Number(last.micros), id: last.id } : undefined;
  return { items: page.map(toTransaction), nextCursor: nextKey ? encodeCursor(nextKey) : null };
}

const isUuid = (id: string) => z.uuid().safeParse(id).success;

function ownedLiveRow(userId: string, id: string) {
  return and(eq(transactions.id, id), eq(transactions.userId, userId), isNull(transactions.deletedAt));
}

export async function getTransaction(userId: string, id: string): Promise<Transaction | undefined> {
  if (!isUuid(id)) return undefined;
  const [row] = await db.select().from(transactions).where(ownedLiveRow(userId, id));
  return row && toTransaction(row);
}

export type UpdateResult =
  | { transaction: Transaction }
  | { notFound: true }
  | { notEditable: true }
  | { changed: true }
  | { validation: z.ZodError }
  | { invalid: InvalidReference };

/** Only references the request changes are re-checked, so a row whose account was archived later can still be edited. */
async function checkChangedReferences(userId: string, row: Row, input: TransactionUpdateInput) {
  const accountFields: Partial<Record<"accountId" | "toAccountId", string>> = {};
  if (input.accountId && input.accountId !== row.accountId) accountFields.accountId = input.accountId;
  if (input.toAccountId && input.toAccountId !== row.toAccountId) accountFields.toAccountId = input.toAccountId;

  const [account, category] = await Promise.all([
    Object.keys(accountFields).length ? checkAccounts(userId, accountFields) : undefined,
    input.categoryId && input.categoryId !== row.categoryId
      ? checkCategory(userId, input.categoryId, CATEGORY_KIND_FOR[row.type as keyof typeof CATEGORY_KIND_FOR], "categoryId")
      : undefined,
  ]);
  return account ?? category;
}

export async function updateTransaction(userId: string, id: string, body: unknown): Promise<UpdateResult> {
  if (!isUuid(id)) return { notFound: true };
  const [row] = await db
    .select({ ...getTableColumns(transactions), version: sql<string>`(extract(epoch from ${transactions.updatedAt}) * 1000000)::bigint` })
    .from(transactions)
    .where(ownedLiveRow(userId, id));
  if (!row) return { notFound: true };
  if (row.type === "adjustment") return { notEditable: true };

  const parsed = transactionUpdateSchema(row.type as TransactionType).safeParse(body);
  if (!parsed.success) return { validation: parsed.error };
  const input = parsed.data as TransactionUpdateInput;

  // A transfer edited to point at its own source: only visible once merged with the stored row.
  if (row.type === "transfer") {
    const accountId = input.accountId ?? row.accountId;
    const toAccountId = input.toAccountId ?? row.toAccountId;
    if (accountId === toAccountId) return { invalid: { field: "toAccountId", message: "Akun tujuan harus berbeda" } };
  }

  const invalid = await checkChangedReferences(userId, row, input);
  if (invalid) return { invalid };

  const [updated] = await db
    .update(transactions)
    .set({ ...input, updatedAt: sql`now()` })
    // Compared in microseconds (a JS Date would truncate): only if nobody changed the row since the checks above read it.
    .where(and(ownedLiveRow(userId, id), sql`(extract(epoch from ${transactions.updatedAt}) * 1000000)::bigint = ${row.version}::bigint`))
    .returning();
  if (updated) return { transaction: toTransaction(updated) };
  return (await getTransaction(userId, id)) ? { changed: true } : { notFound: true };
}

async function findAnyTransaction(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  return row && toTransaction(row);
}

// Only touches rows that are not already in the target state, so repeating the call
// neither moves deleted_at nor fails.
async function setDeleted(userId: string, id: string, deleted: boolean): Promise<Transaction | undefined> {
  if (!isUuid(id)) return undefined;
  const [updated] = await db
    .update(transactions)
    .set({ deletedAt: deleted ? sql`now()` : null })
    .where(
      and(
        eq(transactions.id, id),
        eq(transactions.userId, userId),
        deleted ? isNull(transactions.deletedAt) : isNotNull(transactions.deletedAt),
      ),
    )
    .returning();
  return updated ? toTransaction(updated) : findAnyTransaction(userId, id);
}

export const softDeleteTransaction = (userId: string, id: string) => setDeleted(userId, id, true);
export const restoreTransaction = (userId: string, id: string) => setDeleted(userId, id, false);
