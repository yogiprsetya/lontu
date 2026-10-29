"use client";

import useSWR from "swr";
import useSWRInfinite from "swr/infinite";
import { apiKey, invalidate, isResourceKey, removeOptimistically } from "@/lib/cache-invalidation";
import { sendJSON } from "@/lib/fetcher";
import { isNetworkError } from "@/lib/offline/network-error";
import { outbox as defaultOutbox, type Outbox, type OutboxBody } from "@/lib/offline/outbox";
import { sendCreate } from "@/lib/offline/submission";
import { removeFromPages } from "@/lib/transaction-cache";
import { filtersToSearchParams, type ListFilters } from "@/lib/transaction-filters";
import type { Transaction, TransactionCreated, TransactionCreateInput, TransactionPage, TransactionTotals, TransactionUpdateInput } from "@/lib/schemas/transaction";

export function isInfiniteTransactionsKey(key: unknown) {
  return isResourceKey("transactions", key) && (key as string).startsWith("$inf$");
}

export type CreateOutcome = { status: "sent"; created: TransactionCreated } | { status: "queued"; id: string };

let persistRequested = false;

// One id per submit, sent online too: a request that reached the server but lost its response
// is then safe to repeat.
function withClientIds(input: TransactionCreateInput): OutboxBody {
  const id = crypto.randomUUID();
  if (input.type === "transfer" && input.fee) return { ...input, id, fee: { ...input.fee, id: crypto.randomUUID() } };
  return { ...input, id };
}

/**
 * Queues the create on the device when there is no connection or no response within 10 s.
 * Any HTTP response, 5xx included, is not queued and throws as before.
 */
export async function createTransaction(
  input: TransactionCreateInput,
  { userId, outbox = defaultOutbox }: { userId: string | undefined; outbox?: Outbox },
): Promise<CreateOutcome> {
  const body = withClientIds(input);
  const queue = async (cause: unknown): Promise<CreateOutcome> => {
    if (!userId) throw cause;
    await outbox.enqueue(userId, body);
    if (!persistRequested) {
      persistRequested = true;
      // Asks the browser not to evict the outbox under storage pressure (iOS clears idle sites).
      void navigator.storage?.persist?.().catch(() => {});
    }
    return { status: "queued", id: body.id };
  };

  if (!navigator.onLine) return queue(new TypeError("Offline"));
  let created: TransactionCreated;
  try {
    created = await sendCreate(body);
  } catch (err) {
    if (isNetworkError(err)) return queue(err);
    throw err;
  }
  await invalidate("transactions");
  return { status: "sent", created };
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
