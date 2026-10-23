import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetUsage } from "@/lib/schemas/budget";

vi.mock("swr", async (importOriginal) => ({ ...(await importOriginal<typeof import("swr")>()), mutate: vi.fn() }));

const { mutate } = await import("swr");
const { budgetSuggestionKey, budgetsKey, copyBudgets, deleteBudget, isBudgetsKey, restoreBudget, setBudgets } = await import(
  "@/hooks/use-budgets"
);
const { revalidateTransactions } = await import("@/hooks/use-transactions");
const { archiveCategory, restoreCategory } = await import("@/hooks/use-categories");

const mockedMutate = vi.mocked(mutate);
const budgetKey = "/api/budgets?period=2026-10";

/** True when some mutate call received a matcher that accepts `key`. */
function revalidated(key: string) {
  return mockedMutate.mock.calls.some(([matcher]) => typeof matcher === "function" && (matcher as (k: unknown) => boolean)(key));
}

beforeEach(() => {
  mockedMutate.mockReset();
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({})));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("budgets SWR keys", () => {
  it("builds the contract key", () => {
    expect(budgetsKey("2026-10")).toBe(budgetKey);
  });

  it("builds the suggestion key, with income only when typed", () => {
    expect(budgetSuggestionKey("2026-10")).toBe("/api/budgets/suggestion?period=2026-10");
    expect(budgetSuggestionKey("2026-10", 7_777_777)).toBe("/api/budgets/suggestion?period=2026-10&income=7777777");
    expect(budgetSuggestionKey("2026-10", 0)).toBe("/api/budgets/suggestion?period=2026-10&income=0");
    expect(isBudgetsKey(budgetSuggestionKey("2026-10"))).toBe(true);
  });

  it.each([budgetKey, "/api/budgets/suggestion?period=2026-10&income=100", "/api/budgets"])("matches %s", (key) => {
    expect(isBudgetsKey(key)).toBe(true);
  });

  it.each([["/api/budgetsx"], ["/api/transactions"], [undefined], [[budgetKey]]])("does not match %j", (key) => {
    expect(isBudgetsKey(key)).toBe(false);
  });
});

describe("cross-module revalidation", () => {
  it("revalidateTransactions also refreshes budget usage", async () => {
    await revalidateTransactions();
    expect(revalidated(budgetKey)).toBe(true);
    expect(revalidated("/api/transactions?type=expense")).toBe(true);
    expect(revalidated("/api/accounts")).toBe(false);
  });

  it.each([
    ["archiveCategory", archiveCategory],
    ["restoreCategory", restoreCategory],
  ])("%s refreshes budget usage", async (_, action) => {
    await action("1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b");
    expect(revalidated(budgetKey)).toBe(true);
  });

  it("setBudgets sends one PUT and refreshes budget usage", async () => {
    const input = { period: "2026-10", items: [{ categoryId: "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b", amount: 1 }] };
    await setBudgets(input);
    expect(fetch).toHaveBeenCalledWith("/api/budgets", expect.objectContaining({ method: "PUT", body: JSON.stringify(input) }));
    expect(revalidated(budgetKey)).toBe(true);
  });
});

describe("deleteBudget", () => {
  const usage: BudgetUsage = {
    period: "2026-10",
    items: [
      {
        categoryId: "makan",
        spendingType: "needs",
        budgetId: "budget-makan",
        budget: 100,
        spent: 50,
        remaining: 50,
        percent: 50,
        status: "ok",
      },
    ],
    summary: {
      needs: { budget: 100, spent: 50, unbudgetedSpent: 0 },
      wants: { budget: 0, spent: 0, unbudgetedSpent: 0 },
      total: { budget: 100, spent: 50, unbudgetedSpent: 0 },
    },
  };

  function optimisticUpdate() {
    const call = mockedMutate.mock.calls.find(([key]) => key === budgetKey);
    expect(call, "the month's usage should be updated before the request").toBeDefined();
    expect(call![2]).toEqual({ revalidate: false });
    return call![1] as (current?: BudgetUsage) => BudgetUsage | undefined;
  }

  it("clears the budget in the month's cache at once, sends DELETE, then revalidates", async () => {
    await deleteBudget("2026-10", "budget-makan");
    const next = optimisticUpdate()(usage)!;
    expect(next.items[0]).toMatchObject({ budgetId: null, budget: null, status: "none" });
    expect(next.summary.total).toEqual({ budget: 0, spent: 50, unbudgetedSpent: 50 });
    expect(fetch).toHaveBeenCalledWith("/api/budgets/budget-makan", expect.objectContaining({ method: "DELETE" }));
    expect(revalidated(budgetKey)).toBe(true);
  });

  it("revalidates to roll back and rethrows when the server refuses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ error: { code: "INTERNAL", message: "x" } }, { status: 500 }));
    await expect(deleteBudget("2026-10", "budget-makan")).rejects.toMatchObject({ status: 500 });
    expect(revalidated(budgetKey)).toBe(true);
  });

  it("restoreBudget posts to restore and revalidates", async () => {
    await restoreBudget("budget-makan");
    expect(fetch).toHaveBeenCalledWith("/api/budgets/budget-makan/restore", expect.objectContaining({ method: "POST" }));
    expect(revalidated(budgetKey)).toBe(true);
  });
});

describe("copyBudgets", () => {
  it("posts the target month and refreshes budget usage", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json({ copied: 2 }));
    expect(await copyBudgets("2026-10")).toEqual({ copied: 2 });
    expect(fetch).toHaveBeenCalledWith(
      "/api/budgets/copy",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ to: "2026-10" }) }),
    );
    expect(revalidated(budgetKey)).toBe(true);
  });
});
