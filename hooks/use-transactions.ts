"use client";

import { mutate } from "swr";
import { revalidateAccounts } from "@/hooks/use-accounts";
import { sendJSON } from "@/lib/fetcher";
import type { TransactionCreated, TransactionCreateInput } from "@/lib/schemas/transaction";

// `$inf$` is useSWRInfinite's prefix for its aggregate entry.
const TRANSACTIONS_KEY = /^(\$inf\$)?\/api\/transactions($|[/?])/;

export function isTransactionsKey(key: unknown) {
  return typeof key === "string" && TRANSACTIONS_KEY.test(key);
}

/** Refreshes every list, totals and detail entry under /api/transactions. */
export function revalidateTransactions() {
  return mutate(isTransactionsKey);
}

export async function createTransaction(input: TransactionCreateInput) {
  const created = await sendJSON<TransactionCreated>("/api/transactions", "POST", input);
  await Promise.all([revalidateTransactions(), revalidateAccounts()]);
  return created;
}
