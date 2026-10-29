import { budgetStatus, type BudgetStatus } from "@/lib/budget-status";
import { formatIDR, HIDDEN_AMOUNT } from "@/lib/money";
import { parsePeriod } from "@/lib/period";
import { filtersToUrl } from "@/lib/transaction-filters";
import { maxBudgetPeriod, type BudgetGroup, type BudgetPeriod, type BudgetSuggestion } from "@/lib/schemas/budget";

/** `?period=` from the page URL; anything the API would reject falls back to the current month. */
export function budgetPeriodFromParam(value: string | null, today: string): BudgetPeriod {
  return parsePeriod(value, { modes: ["month"], today, max: maxBudgetPeriod(today) });
}

/** Spending types that take a budget, in display order. */
export const BUDGET_GROUPS = [
  { key: "needs", label: "Needs" },
  { key: "wants", label: "Wants" },
] as const;

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

export function formatBudgetAmount(amount: number, hideAmounts: boolean) {
  return hideAmounts ? HIDDEN_AMOUNT : formatIDR(amount);
}

/** Same URL dashboard's Budget Summary links to. */
export function budgetTransactionsHref(period: BudgetPeriod, categoryId: string) {
  return `/transactions?${filtersToUrl({ period, type: "expense", categoryId })}`;
}

/** `copied` alone cannot tell "nothing new to copy" from "the source month was empty". */
export function copyResultMessage(copied: number, sourceHasBudgets: boolean, sourceLabel: string) {
  if (copied > 0) return `${copied} budget disalin dari ${sourceLabel}`;
  return sourceHasBudgets ? "0 budget disalin. Semua kategori sudah punya budget." : `${sourceLabel} belum punya budget`;
}

/** Rows that would replace an existing budget start unchecked. */
export function defaultSuggestionSelection(items: BudgetSuggestion["items"]) {
  return new Set(items.filter((i) => i.current === null).map((i) => i.categoryId));
}

export function selectedSuggestionItems(items: BudgetSuggestion["items"], selected: ReadonlySet<string>) {
  return items.filter((i) => selected.has(i.categoryId)).map(({ categoryId, amount }) => ({ categoryId, amount }));
}
