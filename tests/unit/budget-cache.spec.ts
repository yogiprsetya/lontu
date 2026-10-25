import { describe, expect, it } from "vitest";
import { removeBudgetFromUsage } from "@/lib/budget-cache";
import { summarizeBudgets } from "@/lib/budget-status";
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

describe("removeBudgetFromUsage", () => {
  it("turns the item back to no budget and recomputes the summary", () => {
    const next = removeBudgetFromUsage(usage, "budget-makan");
    expect(next.items).toEqual([
      kos,
      { ...makan, budgetId: null, budget: null, remaining: null, percent: null, status: "none" },
      hiburan,
    ]);
    expect(next.summary).toEqual({
      needs: { budget: 500_000, spent: 1_300_000, unbudgetedSpent: 1_300_000 },
      wants: { budget: 0, spent: 200_000, unbudgetedSpent: 200_000 },
      total: { budget: 500_000, spent: 1_500_000, unbudgetedSpent: 1_500_000 },
    });
  });

  it("does not mutate the cached object", () => {
    const before = structuredClone(usage);
    removeBudgetFromUsage(usage, "budget-makan");
    expect(usage).toEqual(before);
  });

  it("returns the same object for an unknown budget id", () => {
    expect(removeBudgetFromUsage(usage, "other")).toBe(usage);
  });
});
