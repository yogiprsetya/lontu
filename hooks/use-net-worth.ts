"use client";

import useSWR from "swr";
import { apiKey, invalidate } from "@/lib/cache-invalidation";
import { sendJSON } from "@/lib/fetcher";
import type {
  NetWorthCreateInput,
  NetWorthProgress,
  NetWorthUpdateInput,
} from "@/lib/schemas/net-worth";

type Options = { includeArchived?: boolean };

export function netWorthsKey({ includeArchived = false }: Options = {}) {
  return apiKey("netWorths", { query: { includeArchived: includeArchived ? "true" : undefined } });
}

export function useNetWorths(options: Options = {}) {
  return useSWR<NetWorthProgress[]>(netWorthsKey(options));
}

export async function createNetWorth(input: NetWorthCreateInput) {
  const netWorth = await sendJSON<NetWorthProgress>("/api/net-worth", "POST", input);
  await invalidate("netWorths");
  return netWorth;
}

export async function updateNetWorth(id: string, input: NetWorthUpdateInput) {
  const netWorth = await sendJSON<NetWorthProgress>(`/api/net-worth/${id}`, "PATCH", input);
  await invalidate("netWorths");
  return netWorth;
}

export async function archiveNetWorth(id: string) {
  const netWorth = await sendJSON<NetWorthProgress>(`/api/net-worth/${id}`, "DELETE");
  await invalidate("netWorths");
  return netWorth;
}

/** Throws ApiError 409 NET_WORTH_RESTORE_CONFLICT when another net worth took its name or an account. */
export async function restoreNetWorth(id: string) {
  const netWorth = await sendJSON<NetWorthProgress>(`/api/net-worth/${id}/restore`, "POST");
  await invalidate("netWorths");
  return netWorth;
}
