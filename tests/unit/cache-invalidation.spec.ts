import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("swr", async (importOriginal) => ({ ...(await importOriginal<typeof import("swr")>()), mutate: vi.fn() }));

const { mutate } = await import("swr");
const { affectedBy, invalidate, isResourceKey } = await import("@/lib/cache-invalidation");
const { deleteTransaction } = await import("@/hooks/use-transactions");
const { updateAccount } = await import("@/hooks/use-accounts");

const mockedMutate = vi.mocked(mutate);
const id = "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b";

const keys = {
  accounts: "/api/accounts?include=archived",
  categories: "/api/categories",
  transactions: "$inf$/api/transactions?type=expense",
  budgets: "/api/budgets?period=2026-10",
} as const;

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

describe("isResourceKey", () => {
  it.each([
    ["accounts", "/api/accounts"],
    ["accounts", "/api/accounts/abc"],
    ["categories", "/api/categories?include=archived"],
    ["transactions", "/api/transactions/totals?type=expense"],
    ["transactions", "$inf$/api/transactions"],
    ["budgets", "/api/budgets/suggestion?period=2026-10"],
  ] as const)("%s matches %s", (resource, key) => {
    expect(isResourceKey(resource, key)).toBe(true);
  });

  it.each([
    ["accounts", "/api/accountsx"],
    ["categories", "/api/accounts"],
    ["budgets", "$inf$/api/budgets"],
    ["transactions", undefined],
    ["transactions", ["/api/transactions"]],
  ] as const)("%s does not match %j", (resource, key) => {
    expect(isResourceKey(resource, key)).toBe(false);
  });
});

describe("affectedBy", () => {
  it.each([
    ["transactions", ["transactions", "accounts", "budgets"]],
    ["accounts", ["accounts", "transactions"]],
    ["categories", ["categories", "budgets"]],
    ["budgets", ["budgets"]],
  ] as const)("a %s change refreshes %j", (resource, expected) => {
    expect(affectedBy(resource)).toEqual(expected);
  });
});

describe("invalidate", () => {
  it("refreshes every affected resource in one call and nothing else", async () => {
    await invalidate("categories");
    expect(mockedMutate).toHaveBeenCalledTimes(1);
    expect(revalidated(keys.categories)).toBe(true);
    expect(revalidated(keys.budgets)).toBe(true);
    expect(revalidated(keys.accounts)).toBe(false);
    expect(revalidated(keys.transactions)).toBe(false);
  });

  it("skips the excepted key", async () => {
    await invalidate("transactions", { except: `/api/transactions/${id}` });
    expect(revalidated(`/api/transactions/${id}`)).toBe(false);
    expect(revalidated(keys.transactions)).toBe(true);
  });
});

describe("mutations refresh what they make stale", () => {
  it("deleting a transaction refreshes budget usage and balances", async () => {
    await deleteTransaction(id);
    expect(revalidated(keys.budgets)).toBe(true);
    expect(revalidated(keys.accounts)).toBe(true);
    expect(revalidated(`/api/transactions/${id}`)).toBe(false);
  });

  it("editing an account refreshes the transaction list, which may gain an adjustment", async () => {
    await updateAccount(id, { initialBalance: 100 });
    expect(revalidated(keys.transactions)).toBe(true);
    expect(revalidated(keys.accounts)).toBe(true);
  });
});
