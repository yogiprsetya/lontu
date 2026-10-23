import type { BudgetGroup, BudgetUsage, BudgetUsageItem } from "@/lib/schemas/budget";

export type BudgetStatus = "none" | "ok" | "warning" | "over";

export const BUDGET_WARNING_PERCENT = 80;

/** Shared by the server usage query and the client's optimistic cache updates. */
export function budgetStatus(budget: number | null, spent: number) {
  if (budget === null) return { remaining: null, percent: null, status: "none" as BudgetStatus };
  const remaining = budget - spent;
  if (budget === 0) return { remaining, percent: null, status: (spent > 0 ? "over" : "ok") as BudgetStatus };
  // Thresholds compare exact amounts, so 100.4% is over even though percent shows 100.
  const status: BudgetStatus =
    spent > budget ? "over" : spent * 100 >= budget * BUDGET_WARNING_PERCENT ? "warning" : "ok";
  return { remaining, percent: Math.floor((spent * 100) / budget), status };
}

const emptyGroup = (): BudgetGroup => ({ budget: 0, spent: 0, unbudgetedSpent: 0 });

/** Sums dozens of already-aggregated rows; shared so an optimistic summary equals the server's. */
export function summarizeBudgets(items: BudgetUsageItem[]): BudgetUsage["summary"] {
  const summary = { needs: emptyGroup(), wants: emptyGroup(), total: emptyGroup() };
  for (const item of items) {
    for (const group of [summary[item.spendingType], summary.total]) {
      group.budget += item.budget ?? 0;
      group.spent += item.spent;
      if (item.budget === null) group.unbudgetedSpent += item.spent;
    }
  }
  return summary;
}
