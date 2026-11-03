"use client";

import useSWR from "swr";
import { apiKey } from "@/lib/cache-invalidation";
import type { AssetHistory, AssetHistoryRange } from "@/lib/schemas/asset-history";

type Options = { range: AssetHistoryRange; accountId: string | null };

/** Under `/api/valuations`, so every change that refreshes the asset values refreshes this too. */
export function assetHistoryKey({ range, accountId }: Options) {
  return apiKey("valuations", {
    path: "history",
    query: { range, accountId: accountId ?? undefined },
  });
}

export function useAssetHistory(options: Options) {
  return useSWR<AssetHistory>(assetHistoryKey(options));
}
