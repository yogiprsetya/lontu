import { z } from "zod";
import type { BudgetStatus } from "@/lib/budget-status";
import { todayInJakarta } from "@/lib/date";
import type { SpendingType } from "@/lib/schemas/category";
import { MIN_PERIOD_YEAR, shiftPeriod, type MonthPeriod } from "@/lib/period";

/** Stored as `year` + `month` columns. */
export type BudgetPeriod = MonthPeriod;

export type Budget = {
  id: string;
  categoryId: string;
  period: BudgetPeriod;
  amount: number;
  createdAt: string;
  deletedAt: string | null;
};

export type BudgetUsageItem = {
  categoryId: string;
  spendingType: SpendingType;
  budgetId: string | null;
  /** Null when the category has no active budget this month. */
  budget: number | null;
  spent: number;
  remaining: number | null;
  percent: number | null;
  status: BudgetStatus;
};

export type BudgetGroup = { budget: number; spent: number; unbudgetedSpent: number };

export type BudgetUsage = {
  period: BudgetPeriod;
  items: BudgetUsageItem[];
  summary: { needs: BudgetGroup; wants: BudgetGroup; total: BudgetGroup };
};

export type BudgetSuggestion = {
  period: BudgetPeriod;
  basis: number;
  basisSource: "previous_month" | "input";
  pools: { needs: number; wants: number; saving: number };
  items: {
    categoryId: string;
    spendingType: SpendingType;
    amount: number;
    current: number | null;
  }[];
};

export const BUDGET_PERIOD_FORMAT = /^\d{4}-(0[1-9]|1[0-2])$/;

/** Next month: budgets can be prepared before the month starts. */
export function maxBudgetPeriod(today: string): BudgetPeriod {
  return shiftPeriod(today.slice(0, 7), 1);
}

// Same-length YYYY-MM strings compare correctly as text. The upper bound is read at
// parse time, so a long-lived schema never goes stale across a month boundary.
export const budgetPeriodSchema = z
  .string("Periode tidak valid")
  .regex(BUDGET_PERIOD_FORMAT, "Periode tidak valid")
  .refine((p) => Number(p.slice(0, 4)) >= MIN_PERIOD_YEAR, "Periode minimal Januari 2000")
  .refine((p) => p <= maxBudgetPeriod(todayInJakarta()), "Periode maksimal bulan depan");

export const budgetAmount = z
  .int("Nominal harus bilangan bulat rupiah")
  .min(0, "Nominal minimal Rp0")
  .max(1e12, "Maksimal 1 triliun");

// Item issues flatten onto `fields.items`, which the forms show as one message.
const budgetItem = z.strictObject({
  categoryId: z.uuid("Kategori tidak valid"),
  amount: budgetAmount,
});

export const budgetSetSchema = z.strictObject({
  period: budgetPeriodSchema,
  items: z
    .array(budgetItem, "Daftar budget tidak valid")
    .min(1, "Minimal satu budget")
    .max(100, "Maksimal 100 budget")
    .refine(
      (items) => new Set(items.map((i) => i.categoryId)).size === items.length,
      "Kategori tidak boleh ganda",
    ),
});

export type BudgetSetInput = z.infer<typeof budgetSetSchema>;

export const budgetCopySchema = z.strictObject({ to: budgetPeriodSchema });

export const budgetSuggestionQuerySchema = z.object({
  period: budgetPeriodSchema,
  income: z.coerce
    .number("Income tidak valid")
    .int("Income harus bilangan bulat rupiah")
    .min(0, "Income minimal Rp0")
    .max(1e12, "Maksimal 1 triliun")
    .optional(),
});
