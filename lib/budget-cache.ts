import { summarizeBudgets } from "@/lib/budget-status";
import type { BudgetUsage } from "@/lib/schemas/budget";

/** Optimistic delete: the item goes back to "no budget" and the summary is recomputed. */
export function removeBudgetFromUsage(usage: BudgetUsage, budgetId: string): BudgetUsage {
  if (!usage.items.some((i) => i.budgetId === budgetId)) return usage;
  const items = usage.items.map((item) =>
    item.budgetId === budgetId
      ? {
          ...item,
          budgetId: null,
          budget: null,
          remaining: null,
          percent: null,
          status: "none" as const,
        }
      : item,
  );
  return { ...usage, items, summary: summarizeBudgets(items) };
}
