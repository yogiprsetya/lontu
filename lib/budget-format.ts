import { budgetStatus, type BudgetStatus } from "@/lib/budget-status";
import { formatIDR } from "@/lib/money";
import { filtersToUrl } from "@/lib/transaction-filters";
import {
  BUDGET_PERIOD_FORMAT,
  MIN_BUDGET_PERIOD,
  maxBudgetPeriod,
  type BudgetGroup,
  type BudgetPeriod,
} from "@/lib/schemas/budget";

/** `?period=` from the page URL; anything the API would reject falls back to the current month. */
export function budgetPeriodFromParam(value: string | null, today: string): BudgetPeriod {
  const valid = value && BUDGET_PERIOD_FORMAT.test(value) && value >= MIN_BUDGET_PERIOD && value <= maxBudgetPeriod(today);
  return valid ? value : today.slice(0, 7);
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

export function formatBudgetAmount(amount: number, hideAmounts: boolean) {
  return hideAmounts ? "Rp•••••" : formatIDR(amount);
}

/** Same URL dashboard's Budget Summary links to. */
export function budgetTransactionsHref(period: BudgetPeriod, categoryId: string) {
  return `/transactions?${filtersToUrl({ period, type: "expense", categoryId })}`;
}
