"use client";

import useSWR, { mutate } from "swr";
import useSWRInfinite from "swr/infinite";
import { invalidate, isResourceKey } from "@/lib/cache-invalidation";
import { sendJSON } from "@/lib/fetcher";
import { removeFromPages } from "@/lib/transaction-cache";
import { filtersToSearchParams, type ListFilters } from "@/lib/transaction-filters";
import type { Transaction, TransactionCreated, TransactionCreateInput, TransactionPage, TransactionTotals, TransactionUpdateInput } from "@/lib/schemas/transaction";

export function isInfiniteTransactionsKey(key: unknown) {
  return isResourceKey("transactions", key) && (key as string).startsWith("$inf$");
}

export async function createTransaction(input: TransactionCreateInput) {
  const created = await sendJSON<TransactionCreated>("/api/transactions", "POST", input);
  await invalidate("transactions");
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
  await invalidate("transactions");
  return updated;
}

/**
 * Removes the row from every cached list at once, then asks the server. If the server refuses,
 * a revalidation brings the real rows back. The detail entry is left alone: refetching a
 * deleted row would 404 under the page that is closing.
 */
export async function deleteTransaction(id: string) {
  const detailKey = `/api/transactions/${id}`;
  void mutate(
    isInfiniteTransactionsKey,
    (pages?: TransactionPage[]) => pages && removeFromPages(pages, id),
    { revalidate: false },
  );
  try {
    const deleted = await sendJSON<Transaction>(detailKey, "DELETE");
    await invalidate("transactions", { except: detailKey });
    return deleted;
  } catch (err) {
    await invalidate("transactions");
    throw err;
  }
}

export async function restoreTransaction(id: string) {
  const restored = await sendJSON<Transaction>(`/api/transactions/${id}/restore`, "POST");
  await invalidate("transactions");
  return restored;
}
