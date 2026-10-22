"use client";

import useSWRInfinite from "swr/infinite";
import { mutate } from "swr";
import { revalidateAccounts } from "@/hooks/use-accounts";
import { sendJSON } from "@/lib/fetcher";
import type { TransactionCreated, TransactionCreateInput, TransactionPage } from "@/lib/schemas/transaction";

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

/** `getKey` for useSWRInfinite: null once the previous page has no next cursor. */
export function transactionsPageKey(pageIndex: number, previous: TransactionPage | null) {
  if (pageIndex === 0 || !previous) return "/api/transactions";
  if (!previous.nextCursor) return null;
  return `/api/transactions?cursor=${encodeURIComponent(previous.nextCursor)}`;
}

export function useTransactions() {
  const swr = useSWRInfinite<TransactionPage>(transactionsPageKey);
  const pages = swr.data;
  return {
    ...swr,
    items: pages?.flatMap((p) => p.items),
    hasMore: !!pages?.at(-1)?.nextCursor,
    isLoadingMore: !!pages && swr.size > 0 && typeof pages[swr.size - 1] === "undefined",
  };
}
