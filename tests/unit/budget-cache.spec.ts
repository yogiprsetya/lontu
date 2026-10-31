import { describe, expect, it } from "vitest";
import { endBudgetInUsage } from "@/lib/budget-cache";
import { summarizeBudgets } from "@/lib/budget-status";
import type { BudgetUsage as NamedUsage } from "@/lib/schemas/budget-usage";
import type { BudgetUsage, BudgetUsageItem } from "@/lib/schemas/budget";

const makan: BudgetUsageItem = {
  categoryId: "makan",
  spendingType: "needs",
  budgetId: "budget-makan",
  budget: 1_500_000,
  spent: 1_300_000,
  remaining: 200_000,
  percent: 86,
  status: "warning",
};
const kos: BudgetUsageItem = {
  categoryId: "kos",
  spendingType: "needs",
  budgetId: "budget-kos",
  budget: 500_000,
  spent: 0,
  remaining: 500_000,
  percent: 0,
  status: "ok",
};
const hiburan: BudgetUsageItem = {
  categoryId: "hiburan",
  spendingType: "wants",
  budgetId: null,
  budget: null,
  spent: 200_000,
  remaining: null,
  percent: null,
  status: "none",
};

// Same shape as the GET /api/budgets response for this state (see budget-usage.spec.ts).
const usage: BudgetUsage = {
  period: "2026-10",
  items: [kos, makan, hiburan],
  summary: {
    needs: { budget: 2_000_000, spent: 1_300_000, unbudgetedSpent: 0 },
    wants: { budget: 0, spent: 200_000, unbudgetedSpent: 200_000 },
    total: { budget: 2_000_000, spent: 1_500_000, unbudgetedSpent: 200_000 },
  },
};

describe("summarizeBudgets", () => {
  it("adds up budget, spent and unbudgeted spending per group and in total", () => {
    expect(summarizeBudgets(usage.items)).toEqual(usage.summary);
  });

  it("is all zeros for no items", () => {
    const zero = { budget: 0, spent: 0, unbudgetedSpent: 0 };
    expect(summarizeBudgets([])).toEqual({ needs: zero, wants: zero, total: zero });
  });
});

describe("endBudgetInUsage", () => {
  // Same shape as GET /api/budgets/usage before and after ending "jajan" (see budget-usage.spec.ts).
  const before: NamedUsage = {
    period: "2026-10",
    items: [
      {
        budgetId: "makan",
        name: "Makan",
        spendingType: "needs",
        budget: 1_000_000,
        spent: 600_000,
        remaining: 400_000,
        percent: 60,
        status: "ok",
        categories: [{ categoryId: "makan", spent: 600_000 }],
      },
      {
        budgetId: "jajan",
        name: "Jajan & Hiburan",
        spendingType: "wants",
        budget: 800_000,
        spent: 700_000,
        remaining: 100_000,
        percent: 87,
        status: "warning",
        categories: [
          { categoryId: "hiburan", spent: 0 },
          { categoryId: "jajan", spent: 700_000 },
        ],
      },
    ],
    unbudgeted: [{ categoryId: "kesehatan", spendingType: "needs", spent: 100_000 }],
    summary: {
      needs: { budget: 1_000_000, spent: 700_000, unbudgetedSpent: 100_000 },
      wants: { budget: 800_000, spent: 700_000, unbudgetedSpent: 0 },
      total: { budget: 1_800_000, spent: 1_400_000, unbudgetedSpent: 100_000 },
    },
  };
  const after: NamedUsage = {
    period: "2026-10",
    items: [before.items[0]],
    unbudgeted: [
      { categoryId: "kesehatan", spendingType: "needs", spent: 100_000 },
      { categoryId: "jajan", spendingType: "wants", spent: 700_000 },
    ],
    summary: {
      needs: { budget: 1_000_000, spent: 700_000, unbudgetedSpent: 100_000 },
      wants: { budget: 0, spent: 700_000, unbudgetedSpent: 700_000 },
      total: { budget: 1_000_000, spent: 1_400_000, unbudgetedSpent: 800_000 },
    },
  };

  it("drops the budget and moves its spending to unbudgeted, as the server would", () => {
    expect(endBudgetInUsage(before, "jajan")).toEqual(after);
  });

  it("keeps the month's total spending", () => {
    expect(endBudgetInUsage(before, "jajan").summary.total.spent).toBe(before.summary.total.spent);
  });

  it("does not mutate the cached object", () => {
    const copy = structuredClone(before);
    endBudgetInUsage(before, "jajan");
    expect(before).toEqual(copy);
  });

  it("returns the same object for an unknown budget id", () => {
    expect(endBudgetInUsage(before, "other")).toBe(before);
  });
});
