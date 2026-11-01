import { z } from "zod";
import { todayInJakarta } from "@/lib/date";
import { MIN_PERIOD_YEAR } from "@/lib/period";
import { BUDGET_PERIOD_FORMAT, type BudgetGroup, type BudgetPeriod } from "@/lib/schemas/budget";
import type { SpendingType } from "@/lib/schemas/category";

export type BudgetStatus = "none" | "ok" | "warning" | "over";

export type BudgetUsageItem = {
  budgetId: string;
  name: string;
  spendingType: SpendingType;
  budget: number;
  spent: number;
  /** budget − spent, may be negative. */
  remaining: number;
  /** null when the budget is 0. */
  percent: number | null;
  status: BudgetStatus;
  /** The budget's categories in this month's version, by lower(name). */
  categories: { categoryId: string; spent: number }[];
};

export type UnbudgetedSpending = { categoryId: string; spendingType: SpendingType; spent: number };

export type BudgetUsage = {
  period: BudgetPeriod;
  items: BudgetUsageItem[];
  /** Spending categories with expense this month that no shown budget covers, archived ones included. */
  unbudgeted: UnbudgetedSpending[];
  summary: { total: BudgetGroup };
};

// Same-length YYYY-MM strings compare correctly as text. The current month is read at parse
// time, so a long-lived schema never goes stale across a month boundary.
export const budgetUsageQuerySchema = z.object({
  period: z
    .string("Periode tidak valid")
    .regex(BUDGET_PERIOD_FORMAT, "Periode tidak valid")
    .refine((p) => Number(p.slice(0, 4)) >= MIN_PERIOD_YEAR, "Periode minimal Januari 2000")
    .refine((p) => p <= todayInJakarta().slice(0, 7), "Periode maksimal bulan ini"),
});
