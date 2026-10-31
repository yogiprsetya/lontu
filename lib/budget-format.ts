import { budgetStatus, type BudgetStatus } from "@/lib/budget-status";
import { parsePeriod } from "@/lib/period";
import { filtersToUrl } from "@/lib/transaction-filters";
import type { BudgetGroup, BudgetPeriod } from "@/lib/schemas/budget";

/** `?period=` from the page URL; anything the API would reject falls back to the current month. */
export function budgetPeriodFromParam(value: string | null, today: string): BudgetPeriod {
  return parsePeriod(value, { modes: ["month"], today, max: today });
}

const STATUS_LABEL: Record<BudgetStatus, string | null> = {
  none: null,
  ok: null,
  warning: "Hampir habis",
  over: "Melebihi budget",
};

export function statusLabel(status: BudgetStatus) {
  return STATUS_LABEL[status];
}

/** A group's bar measures only the spending that has a budget; the rest is shown as "tanpa budget". */
export function groupStatus(group: BudgetGroup) {
  const budgetedSpent = group.spent - group.unbudgetedSpent;
  return { budgetedSpent, ...budgetStatus(group.budget > 0 ? group.budget : null, budgetedSpent) };
}

/** Same URL dashboard's Budget Summary links to. */
export function budgetTransactionsHref(period: BudgetPeriod, categoryId: string) {
  return `/transactions?${filtersToUrl({ period, type: "expense", categoryId })}`;
}
