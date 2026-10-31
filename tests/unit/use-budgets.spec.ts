import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BudgetUsage as NamedBudgetUsage } from "@/lib/schemas/budget-usage";

vi.mock("swr", async (importOriginal) => ({
  ...(await importOriginal<typeof import("swr")>()),
  mutate: vi.fn(),
}));

const { mutate } = await import("swr");
const {
  budgetUsageKey,
  budgetsKey,
  createBudget,
  deleteBudget,
  restoreBudget,
  setBudgets,
  updateBudget,
} = await import("@/hooks/use-budgets");
const { invalidate, isResourceKey } = await import("@/lib/cache-invalidation");
const { archiveCategory, restoreCategory } = await import("@/hooks/use-categories");

const mockedMutate = vi.mocked(mutate);
const budgetKey = "/api/budgets?period=2026-10";

/** True when some mutate call received a matcher that accepts `key`. */
function revalidated(key: string) {
  return mockedMutate.mock.calls.some(
    ([matcher]) => typeof matcher === "function" && (matcher as (k: unknown) => boolean)(key),
  );
}

beforeEach(() => {
  mockedMutate.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({})),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("budgets SWR keys", () => {
  it("builds the contract key", () => {
    expect(budgetsKey("2026-10")).toBe(budgetKey);
  });

  it("builds the usage key under the budgets resource", () => {
    expect(budgetUsageKey("2026-10")).toBe("/api/budgets/usage?period=2026-10");
    expect(isResourceKey("budgets", budgetUsageKey("2026-10"))).toBe(true);
  });

  it.each([budgetKey, "/api/budgets/suggestion?period=2026-10&income=100", "/api/budgets"])(
    "matches %s",
    (key) => {
      expect(isResourceKey("budgets", key)).toBe(true);
    },
  );

  it.each([["/api/budgetsx"], ["/api/transactions"], [undefined], [[budgetKey]]])(
    "does not match %j",
    (key) => {
      expect(isResourceKey("budgets", key)).toBe(false);
    },
  );
});

describe("cross-module revalidation", () => {
  it("a transaction change also refreshes budget usage", async () => {
    await invalidate("transactions");
    expect(revalidated(budgetKey)).toBe(true);
    expect(revalidated("/api/transactions?type=expense")).toBe(true);
  });

  it("a budget change leaves transactions and balances alone", async () => {
    await invalidate("budgets");
    expect(revalidated("/api/transactions?type=expense")).toBe(false);
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
    const input = {
      period: "2026-10",
      items: [{ categoryId: "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b", amount: 1 }],
    };
    await setBudgets(input);
    expect(fetch).toHaveBeenCalledWith(
      "/api/budgets",
      expect.objectContaining({ method: "PUT", body: JSON.stringify(input) }),
    );
    expect(revalidated(budgetKey)).toBe(true);
  });
});

describe("deleteBudget", () => {
  const usageKey = "/api/budgets/usage?period=2026-10";
  const usage: NamedBudgetUsage = {
    period: "2026-10",
    items: [
      {
        budgetId: "budget-jajan",
        name: "Jajan",
        spendingType: "wants",
        budget: 100,
        spent: 50,
        remaining: 50,
        percent: 50,
        status: "ok",
        categories: [{ categoryId: "jajan", spent: 50 }],
      },
    ],
    unbudgeted: [],
    summary: {
      needs: { budget: 0, spent: 0, unbudgetedSpent: 0 },
      wants: { budget: 100, spent: 50, unbudgetedSpent: 0 },
      total: { budget: 100, spent: 50, unbudgetedSpent: 0 },
    },
  };

  function optimisticUpdate() {
    const call = mockedMutate.mock.calls.find(([key]) => key === usageKey);
    expect(call, "the month's usage should be updated before the request").toBeDefined();
    expect(call![2]).toEqual({ revalidate: false });
    return call![1] as (current?: NamedBudgetUsage) => NamedBudgetUsage | undefined;
  }

  it("ends the budget in the month's cache at once, sends DELETE, then revalidates", async () => {
    await deleteBudget("2026-10", "budget-jajan");
    const next = optimisticUpdate()(usage)!;
    expect(next.items).toEqual([]);
    expect(next.unbudgeted).toEqual([{ categoryId: "jajan", spendingType: "wants", spent: 50 }]);
    expect(fetch).toHaveBeenCalledWith(
      "/api/budgets/budget-jajan",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(revalidated(usageKey)).toBe(true);
  });

  it("revalidates to roll back and rethrows when the server refuses", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json({ error: { code: "INTERNAL", message: "x" } }, { status: 500 }),
    );
    await expect(deleteBudget("2026-10", "budget-jajan")).rejects.toMatchObject({ status: 500 });
    expect(revalidated(usageKey)).toBe(true);
  });

  it("restoreBudget posts to restore and revalidates", async () => {
    await restoreBudget("budget-jajan");
    expect(fetch).toHaveBeenCalledWith(
      "/api/budgets/budget-jajan/restore",
      expect.objectContaining({ method: "POST" }),
    );
    expect(revalidated(usageKey)).toBe(true);
  });
});

describe("createBudget", () => {
  it("posts the budget and refreshes every budget key", async () => {
    const input = {
      name: "Jajan & Hiburan",
      spendingType: "wants" as const,
      amount: 800_000,
      categoryIds: ["jajan"],
    };
    await createBudget(input);
    expect(fetch).toHaveBeenCalledWith(
      "/api/budgets",
      expect.objectContaining({ method: "POST", body: JSON.stringify(input) }),
    );
    expect(revalidated("/api/budgets/usage?period=2026-10")).toBe(true);
  });
});

describe("updateBudget", () => {
  it("patches the budget and refreshes every budget key", async () => {
    await updateBudget("budget-jajan", { amount: 900_000 });
    expect(fetch).toHaveBeenCalledWith(
      "/api/budgets/budget-jajan",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ amount: 900_000 }) }),
    );
    expect(revalidated("/api/budgets/usage?period=2026-10")).toBe(true);
  });
});
