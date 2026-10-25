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
};

const DASHBOARD_PERIOD_FORMAT = /^(\d{4}|\d{4}-(0[1-9]|1[0-2]))$/;

// Same-length strings compare correctly as text. Today is read at parse time, so a
// long-lived schema never goes stale across a month boundary.
export const dashboardPeriodSchema = z
  .string("Periode tidak valid")
  .regex(DASHBOARD_PERIOD_FORMAT, "Periode tidak valid")
  .refine((p) => p.slice(0, 4) >= "2000", "Periode minimal tahun 2000")
  .refine((p) => p <= todayInJakarta().slice(0, p.length), "Periode tidak boleh di masa depan");

export const dashboardQuerySchema = z.object({ period: dashboardPeriodSchema });
