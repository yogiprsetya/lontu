import "server-only";
import { type SQL, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions } from "@/db/schema";
import type { TransactionFilters, TransactionTotals } from "@/lib/schemas/transaction";
import { isSaving, transactionWhere } from "@/lib/server/transactions";

const totalWhere = (condition: SQL) =>
  sql<number>`coalesce(sum(${transactions.amount}) filter (where ${condition}), 0)::bigint`.mapWith(
    Number,
  );

const totalOf = (type: "income" | "expense") => totalWhere(sql`${transactions.type} = ${type}`);

/** Only transfers into an asset count, as saving; other transfers and adjustments are left out. */
export async function transactionTotals(
  userId: string,
  filters: TransactionFilters,
): Promise<TransactionTotals> {
  const [row] = await db
    .select({
      income: totalOf("income"),
      expense: totalOf("expense"),
      saving: totalWhere(isSaving),
    })
    .from(transactions)
    .where(transactionWhere(userId, filters));
  return row;
}
