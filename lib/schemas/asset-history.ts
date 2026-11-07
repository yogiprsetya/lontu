import { z } from "zod";

export const ASSET_HISTORY_RANGES = ["6", "12", "all"] as const;

export type AssetHistoryRange = (typeof ASSET_HISTORY_RANGES)[number];

export type AssetHistoryValue = {
  /** End-of-month value, integer rupiah. */
  value: number;
  /** value − marketGain. */
  contributed: number;
  /** Sum of live revaluations up to the end of the month. */
  marketGain: number;
};

export type AssetHistoryPoint = AssetHistoryValue & {
  /** `YYYY-MM`. */
  month: string;
};

export type AssetHistoryMonth = AssetHistoryPoint & {
  /** contributed − the previous month's (or `opening`'s). */
  contributionChange: number;
  /** marketGain − the previous month's (or `opening`'s). */
  marketChange: number;
};

export type AssetHistory = {
  range: AssetHistoryRange;
  /** null = every active asset account combined. */
  accountId: string | null;
  /** End of the month before `months[0]`; all 0 when there is no data before it. */
  opening: AssetHistoryValue;
  /** Oldest first, the last being the current month; empty only without an active asset account. */
  months: AssetHistoryMonth[];
};

export const assetHistoryQuerySchema = z.object({
  range: z.enum(ASSET_HISTORY_RANGES, "Rentang tidak valid").default("12"),
  accountId: z.uuid("Akun tidak valid").optional(),
});
