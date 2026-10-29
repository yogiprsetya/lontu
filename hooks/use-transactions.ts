"use client";

import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { useProfile } from "@/hooks/use-profile";
import { apiKey, invalidate, isResourceKey, removeOptimistically } from "@/lib/cache-invalidation";
import { sendJSON } from "@/lib/fetcher";
import { submitTransaction } from "@/lib/offline/submission";
import { removeFromPages } from "@/lib/transaction-cache";
import { filtersToSearchParams, type ListFilters } from "@/lib/transaction-filters";
import type { Transaction, TransactionCreateInput, TransactionPage, TransactionTotals, TransactionUpdateInput } from "@/lib/schemas/transaction";

export function isInfiniteTransactionsKey(key: unknown) {
  return isResourceKey("transactions", key) && (key as string).startsWith("$inf$");
}

/** `getKey` for useSWRInfinite: null once the previous page has no next cursor. */
export function transactionsPageKey(pageIndex: number, previous: TransactionPage | null, filters?: ListFilters) {
  const params = filters ? filtersToSearchParams(filters) : new URLSearchParams();
  if (pageIndex > 0 && previous) {
    if (!previous.nextCursor) return null;
    params.set("cursor", previous.nextCursor);
  }
  return apiKey("transactions", { query: params });
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
  return apiKey("transactions", { path: "totals", query: filtersToSearchParams(filters) });
}

export function useTransactionTotals(filters: ListFilters) {
  return useSWR<TransactionTotals>(transactionsTotalsKey(filters));
}

export function transactionKey(id: string) {
  return apiKey("transactions", { path: id });
}

export function useTransaction(id: string) {
  return useSWR<Transaction>(transactionKey(id));
}

/** `submit` for the create forms: the signed-in user is bound here, so a queued create knows its owner. */
export function useSubmitTransaction() {
  const userId = useProfile().data?.id;
  return (input: TransactionCreateInput, { sentMessage }: { sentMessage: string }) =>
    submitTransaction(input, { userId, sentMessage });
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
export function deleteTransaction(id: string) {
  const detailKey = transactionKey(id);
  return removeOptimistically({
    match: isInfiniteTransactionsKey,
    update: (pages?: TransactionPage[]) => pages && removeFromPages(pages, id),
    send: () => sendJSON<Transaction>(detailKey, "DELETE"),
    resource: "transactions",
    except: detailKey,
  });
}

export async function restoreTransaction(id: string) {
  const restored = await sendJSON<Transaction>(`/api/transactions/${id}/restore`, "POST");
  await invalidate("transactions");
  return restored;
}
