import "server-only";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { type Cell, toCSV } from "@/lib/csv";
import type { TransactionFilters } from "@/lib/schemas/transaction";
import { transactionWhere } from "@/lib/server/transactions";
import { ADJUSTMENT_LABEL, TRANSACTION_TYPE_LABELS, isTransactionType } from "@/lib/transaction-types";

const HEADER = ["Tanggal", "Jenis", "Jumlah", "Akun", "Akun Tujuan", "Kategori", "Needs/Wants", "Deskripsi"];

const SPENDING_LABELS = { needs: "Needs", wants: "Wants" } as const;

/** Every filtered row in list order, with account and category names (archived ones included). */
export async function exportTransactionsCsv(userId: string, filters: TransactionFilters) {
  const toAccount = alias(accounts, "to_account");
  const rows = await db
    .select({
      date: transactions.date,
      type: transactions.type,
      amount: transactions.amount,
      account: accounts.name,
      toAccount: toAccount.name,
      category: categories.name,
      spendingType: categories.spendingType,
      description: transactions.description,
    })
    .from(transactions)
    .innerJoin(accounts, eq(accounts.id, transactions.accountId))
    .leftJoin(toAccount, eq(toAccount.id, transactions.toAccountId))
    .leftJoin(categories, eq(categories.id, transactions.categoryId))
    .where(transactionWhere(userId, filters))
    .orderBy(desc(transactions.date), desc(transactions.createdAt), desc(transactions.id));

  const body: Cell[][] = rows.map((r) => [
    r.date,
    isTransactionType(r.type) ? TRANSACTION_TYPE_LABELS[r.type] : ADJUSTMENT_LABEL,
    r.amount,
    r.account,
    r.toAccount,
    r.category,
    r.spendingType ? SPENDING_LABELS[r.spendingType as keyof typeof SPENDING_LABELS] : null,
    r.description,
  ]);
  return toCSV([HEADER, ...body]);
}
