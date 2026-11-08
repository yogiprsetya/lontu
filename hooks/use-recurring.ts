"use client";

import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { apiKey, invalidate } from "@/lib/cache-invalidation";
import { ApiError, sendJSON } from "@/lib/fetcher";
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

/** Catat for one occurrence. `record` rethrows only the errors the form itself must report. */
export function useRecordOccurrence(
  rule: RecurringRule,
  occurrenceDate: string,
  onDone: () => void,
) {
  // Once per form, not per submit, so Simpan tapped again after a lost response replays.
  const [id, setId] = useState(() => crypto.randomUUID());

  async function record(body: RecurringAdvanceInput) {
    try {
      await advanceRule(rule.id, body);
      toast.success(`${rule.name} dicatat`);
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.code === "OCCURRENCE_STALE") {
        toast("Kejadian ini sudah ditangani");
        onDone();
        void revalidateRecurring();
        return;
      }
      // The server proved this id is not this request's, so the next Simpan needs a new one.
      if (err instanceof ApiError && err.code === "TRANSACTION_ID_TAKEN") {
        setId(crypto.randomUUID());
        toast.error("Gagal menyimpan. Coba simpan lagi.");
        return;
      }
      throw err;
    }
  }

  return { occurrence: { id, occurrenceDate }, record };
}
