import { z } from "zod";
import { SPENDING_TYPES, type SpendingType } from "@/lib/schemas/category";
import type { MonthPeriod } from "@/lib/period";

/** Stored as `year` + `month` columns. */
export type BudgetPeriod = MonthPeriod;

export type BudgetGroup = { budget: number; spent: number; unbudgetedSpent: number };

export const BUDGET_PERIOD_FORMAT = /^\d{4}-(0[1-9]|1[0-2])$/;

export const budgetAmount = z
  .int("Nominal harus bilangan bulat rupiah")
  .min(0, "Nominal minimal Rp0")
  .max(1e12, "Maksimal 1 triliun");

/** One version of a named budget; `id` is the budget's id, the same across its versions. */
export type BudgetVersion = {
  id: string;
  name: string;
  spendingType: SpendingType;
  amount: number;
  categoryIds: string[];
  /** The month this version takes effect. */
  period: BudgetPeriod;
  deletedAt: string | null;
};

// Same rule as category names.
export const budgetName = z
  .string("Nama wajib diisi")
  .trim()
  .min(1, "Nama wajib diisi")
  .max(50, "Maksimal 50 karakter");

const budgetCategoryIds = z
  .array(z.uuid("Kategori tidak valid"), "Pilih kategori")
  .min(1, "Pilih minimal satu kategori")
  .max(50, "Maksimal 50 kategori")
  .refine((ids) => new Set(ids).size === ids.length, "Kategori tidak boleh ganda");

// No period: every write lands in the current month, which the server decides.
export const budgetCreateSchema = z.strictObject({
  name: budgetName,
  spendingType: z.enum(SPENDING_TYPES, "Pilih needs atau wants"),
  amount: budgetAmount,
  categoryIds: budgetCategoryIds,
});

export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;

// The type is fixed at creation, so spendingType is not accepted here.
export const budgetUpdateSchema = z
  .strictObject({
    name: budgetName.optional(),
    amount: budgetAmount.optional(),
    categoryIds: budgetCategoryIds.optional(),
  })
  .refine((input) => Object.values(input).some((v) => v !== undefined), "Tidak ada perubahan");

export type BudgetUpdateInput = z.infer<typeof budgetUpdateSchema>;
