"use client";

import useSWR from "swr";
import { apiKey, invalidate } from "@/lib/cache-invalidation";
import { sendJSON } from "@/lib/fetcher";
import type { AssetValuation, ValuationInput, ValuationResult } from "@/lib/schemas/valuation";

export function valuationsKey() {
  return apiKey("valuations");
}

export function useValuations() {
  return useSWR<AssetValuation[]>(valuationsKey());
}

/** Throws ApiError; `fields["items.<i>"]` points at the row of `input.items[i]`. */
export async function recordValuations(input: ValuationInput) {
  const result = await sendJSON<ValuationResult>("/api/valuations", "POST", input);
  // Revaluations are transactions: balances, the dashboard and the values all move.
  await invalidate("transactions");
  return result;
}
