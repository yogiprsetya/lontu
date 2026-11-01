import { summarizeBudgetUsage } from "@/lib/budget-status";
import type { BudgetUsage } from "@/lib/schemas/budget-usage";

/**
 * Optimistic end: the budget leaves the list and its categories' spending counts as unbudgeted,
 * so the month's total is unchanged. The revalidation that follows brings the server's order.
 */
export function endBudgetInUsage(usage: BudgetUsage, budgetId: string): BudgetUsage {
  const ended = usage.items.find((i) => i.budgetId === budgetId);
  if (!ended) return usage;
  const items = usage.items.filter((i) => i !== ended);
  const freed = ended.categories
    .filter((c) => c.spent > 0)
    .map((c) => ({ categoryId: c.categoryId, spendingType: ended.spendingType, spent: c.spent }));
  // Needs before wants, as the API orders them.
  const unbudgeted = [...usage.unbudgeted, ...freed].sort(
    (a, b) => Number(a.spendingType === "wants") - Number(b.spendingType === "wants"),
  );
  return { ...usage, items, unbudgeted, summary: summarizeBudgetUsage(items, unbudgeted) };
}
