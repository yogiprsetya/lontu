import type { CategoryKind, SpendingType } from "@/lib/schemas/category";

export const KIND_LABELS: Record<CategoryKind, string> = {
  income: "Income",
  saving: "Saving",
  spending: "Spending",
};
export const SPENDING_TYPE_LABELS: Record<SpendingType, string> = {
  needs: "Needs",
  wants: "Wants",
};
