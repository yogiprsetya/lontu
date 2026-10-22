"use client";

import useSWR, { mutate } from "swr";
import useSWRInfinite from "swr/infinite";
import { revalidateAccounts } from "@/hooks/use-accounts";
import { sendJSON } from "@/lib/fetcher";
import { filtersToSearchParams, type ListFilters } from "@/lib/transaction-filters";
import type { Transaction, TransactionCreated, TransactionCreateInput, TransactionPage, TransactionTotals, TransactionUpdateInput } from "@/lib/schemas/transaction";

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
export function transactionsPageKey(pageIndex: number, previous: TransactionPage | null, filters?: ListFilters) {
  const params = filters ? filtersToSearchParams(filters) : new URLSearchParams();
  if (pageIndex > 0 && previous) {
    if (!previous.nextCursor) return null;
    params.set("cursor", previous.nextCursor);
  }
  const query = params.toString();
  return query ? `/api/transactions?${query}` : "/api/transactions";
}

export function useTransactions(filters: ListFilters) {
  const swr = useSWRInfinite<TransactionPage>((index, previous) => transactionsPageKey(index, previous, filters));
  const pages = swr.data;
  return {
    ...swr,
    items: pages?.flatMap((p) => p.items),
    hasMore: !!pages?.at(-1)?.nextCursor,
    isLoadingMore: !!pages && swr.size > 0 && typeof pages[swr.size - 1] === "undefined",
  };
}

export function transactionsTotalsKey(filters: ListFilters) {
  const query = filtersToSearchParams(filters).toString();
  return query ? `/api/transactions/totals?${query}` : "/api/transactions/totals";
}

export function useTransactionTotals(filters: ListFilters) {
  return useSWR<TransactionTotals>(transactionsTotalsKey(filters));
}

export function useTransaction(id: string) {
  return useSWR<Transaction>(`/api/transactions/${id}`);
}

export async function updateTransaction(id: string, input: Partial<TransactionUpdateInput>) {
  const updated = await sendJSON<Transaction>(`/api/transactions/${id}`, "PATCH", input);
  await Promise.all([revalidateTransactions(), revalidateAccounts()]);
  return updated;
}
