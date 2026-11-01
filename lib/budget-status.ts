import type { BudgetGroup } from "@/lib/schemas/budget";
import type { BudgetUsage, BudgetUsageItem, UnbudgetedSpending } from "@/lib/schemas/budget-usage";

export type BudgetStatus = "none" | "ok" | "warning" | "over";

export const BUDGET_WARNING_PERCENT = 80;

type Measured = {
  remaining: number;
  percent: number | null;
  status: Exclude<BudgetStatus, "none">;
};

/** Shared by the server usage query and the client's optimistic cache updates. */
export function budgetStatus(budget: number, spent: number): Measured;
export function budgetStatus(
  budget: number | null,
  spent: number,
): Measured | { remaining: null; percent: null; status: "none" };
export function budgetStatus(budget: number | null, spent: number) {
  if (budget === null) return { remaining: null, percent: null, status: "none" as const };
  const remaining = budget - spent;
  if (budget === 0)
    return { remaining, percent: null, status: (spent > 0 ? "over" : "ok") as BudgetStatus };
  // Thresholds compare exact amounts: a budget with nothing left is already over, and 99.99% stays a warning.
  const status: BudgetStatus =
    spent >= budget ? "over" : spent * 100 >= budget * BUDGET_WARNING_PERCENT ? "warning" : "ok";
  return { remaining, percent: Math.floor((spent * 100) / budget), status };
}

const emptyGroup = (): BudgetGroup => ({ budget: 0, spent: 0, unbudgetedSpent: 0 });

/** Shared by the usage query and optimistic updates, so both give the same summary. */
export function summarizeBudgetUsage(
  items: BudgetUsageItem[],
  unbudgeted: UnbudgetedSpending[],
): BudgetUsage["summary"] {
  const summary = { needs: emptyGroup(), wants: emptyGroup(), total: emptyGroup() };
  for (const item of items) {
    for (const group of [summary[item.spendingType], summary.total]) {
      group.budget += item.budget;
      group.spent += item.spent;
    }
  }
  for (const row of unbudgeted) {
    for (const group of [summary[row.spendingType], summary.total]) {
      group.spent += row.spent;
      group.unbudgetedSpent += row.spent;
    }
  }
  return summary;
}

const ATTENTION: Record<BudgetStatus, number> = { over: 0, warning: 1, ok: 2, none: 3 };

type Ranked = Pick<BudgetUsageItem, "name" | "status" | "percent">;

// A zero budget has no percent: spent, it is the fullest of all; unspent, the emptiest.
const fullness = ({ percent, status }: Ranked) =>
  percent ?? (status === "over" ? Number.MAX_SAFE_INTEGER : -1);

/** Over, then warning, then ok; within a status the fullest first, then by name. */
export function compareByAttention(a: Ranked, b: Ranked) {
  return (
    ATTENTION[a.status] - ATTENTION[b.status] ||
    fullness(b) - fullness(a) ||
    a.name.localeCompare(b.name, "id", { sensitivity: "base" })
  );
}
