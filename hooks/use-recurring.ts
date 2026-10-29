"use client";

import useSWR from "swr";
import { apiKey, invalidate } from "@/lib/cache-invalidation";
import { sendJSON } from "@/lib/fetcher";
import type {
  AdvanceResult,
  RecurringAdvanceInput,
  RecurringCreateInput,
  RecurringOverview,
  RecurringRule,
  RecurringUpdateInput,
} from "@/lib/schemas/recurring";

type Options = { includeArchived?: boolean };

export function recurringKey({ includeArchived = false }: Options = {}) {
  return apiKey("recurring", { query: { includeArchived: includeArchived ? "true" : undefined } });
}

export function useRecurring(options: Options = {}) {
  return useSWR<RecurringOverview>(recurringKey(options));
}

export function revalidateRecurring() {
  return invalidate("recurring");
}

export async function createRule(input: RecurringCreateInput) {
  const rule = await sendJSON<RecurringRule>("/api/recurring", "POST", input);
  await invalidate("recurring");
  return rule;
}

export async function updateRule(id: string, input: RecurringUpdateInput) {
  const rule = await sendJSON<RecurringRule>(`/api/recurring/${id}`, "PATCH", input);
  await invalidate("recurring");
  return rule;
}

export async function archiveRule(id: string) {
  const rule = await sendJSON<RecurringRule>(`/api/recurring/${id}`, "DELETE");
  await invalidate("recurring");
  return rule;
}

export async function restoreRule(id: string) {
  const rule = await sendJSON<RecurringRule>(`/api/recurring/${id}/restore`, "POST");
  await invalidate("recurring");
  return rule;
}

/** Catat or Lewati. Throws ApiError, including 409 OCCURRENCE_STALE when the occurrence was already handled. */
export async function advanceRule(id: string, input: RecurringAdvanceInput) {
  const result = await sendJSON<AdvanceResult>(`/api/recurring/${id}/advance`, "POST", input);
  // A post writes a transaction, which also reaches balances, budgets, the dashboard and recurring.
  await invalidate(input.action === "post" ? "transactions" : "recurring");
  return result;
}
