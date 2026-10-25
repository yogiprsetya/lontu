import { z } from "zod";
import { todayInJakarta } from "@/lib/date";
import type { TransactionTotals } from "@/lib/schemas/transaction";

/** `YYYY-MM` or `YYYY`. */
export type DashboardPeriod = string;

export type DashboardMode = "month" | "year";

/** `YYYY-MM-DD`, both ends inclusive. */
export type DateRange = { from: string; to: string };

/** `net` = income − expense − saving, may be negative. */
export type DashboardTotals = TransactionTotals & { net: number };

export type DashboardSummary = {
  period: DashboardPeriod;
  /** `to` is cut at today for the current period. */
  range: DateRange;
  previous: { period: DashboardPeriod; range: DateRange };
  totals: DashboardTotals;
  previousTotals: DashboardTotals;
  /** `YYYY-MM-DD` per day (month mode) or `YYYY-MM` per month (year mode), ascending, empty buckets at 0. */
  activity: { bucket: string; expense: number }[];
};

export const DASHBOARD_PERIOD_FORMAT = /^(\d{4}|\d{4}-(0[1-9]|1[0-2]))$/;

// Same-length strings compare correctly as text.
export function isPastOrCurrentPeriod(period: DashboardPeriod, today: string) {
  return period.slice(0, 4) >= "2000" && period <= today.slice(0, period.length);
}

// Today is read at parse time, so a long-lived schema never goes stale across a month boundary.
export const dashboardPeriodSchema = z
  .string("Periode tidak valid")
  .regex(DASHBOARD_PERIOD_FORMAT, "Periode tidak valid")
  .refine((p) => isPastOrCurrentPeriod(p, todayInJakarta()), "Periode antara tahun 2000 dan sekarang");

export const dashboardQuerySchema = z.object({ period: dashboardPeriodSchema });
