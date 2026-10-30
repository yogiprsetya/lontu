import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import type { TransactionFilters, TransactionTotals } from "@/lib/schemas/transaction";
import { transactionWhere } from "@/lib/server/transactions";

const totalOf = (type: keyof TransactionTotals) =>
  sql<number>`coalesce(sum(${transactions.amount}) filter (where ${transactions.type} = ${type}), 0)::bigint`.mapWith(
    Number,
  );

/** Transfers and adjustments are not income, spending or saving, so they are left out. */
export async function transactionTotals(
  userId: string,
  filters: TransactionFilters,
): Promise<TransactionTotals> {
  const [row] = await db
    .select({ income: totalOf("income"), expense: totalOf("expense"), saving: totalOf("saving") })
    .from(transactions)
    .where(transactionWhere(userId, filters));
  return row;
}
