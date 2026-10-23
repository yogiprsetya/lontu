import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("swr", async (importOriginal) => ({ ...(await importOriginal<typeof import("swr")>()), mutate: vi.fn() }));

const { mutate } = await import("swr");
const { budgetsKey, isBudgetsKey, setBudgets } = await import("@/hooks/use-budgets");
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
