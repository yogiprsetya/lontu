import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("swr", async (importOriginal) => ({ ...(await importOriginal<typeof import("swr")>()), mutate: vi.fn() }));

const { mutate } = await import("swr");
const { affectedBy, invalidate, isResourceKey } = await import("@/lib/cache-invalidation");
const { deleteTransaction } = await import("@/hooks/use-transactions");
const { updateAccount } = await import("@/hooks/use-accounts");
const { archiveRule } = await import("@/hooks/use-recurring");

const mockedMutate = vi.mocked(mutate);
const id = "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b";

const keys = {
  accounts: "/api/accounts?include=archived",
  categories: "/api/categories",
  transactions: "$inf$/api/transactions?type=expense",
  budgets: "/api/budgets?period=2026-10",
  dashboard: "/api/dashboard?period=2026-10",
  recurring: "/api/recurring?includeArchived=true",
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
    ["dashboard", "/api/dashboard?period=2026-10"],
    ["recurring", "/api/recurring"],
    ["recurring", "/api/recurring?includeArchived=true"],
  ] as const)("%s matches %s", (resource, key) => {
    expect(isResourceKey(resource, key)).toBe(true);
  });

  it.each([
    ["accounts", "/api/accountsx"],
    ["categories", "/api/accounts"],
    ["budgets", "$inf$/api/budgets"],
    ["dashboard", "/api/dashboards"],
    ["recurring", "/api/recurringx"],
    ["recurring", "/api/transactions"],
    ["transactions", undefined],
    ["transactions", ["/api/transactions"]],
  ] as const)("%s does not match %j", (resource, key) => {
    expect(isResourceKey(resource, key)).toBe(false);
  });
});

describe("affectedBy", () => {
  it.each([
    ["transactions", ["transactions", "accounts", "budgets", "dashboard", "recurring"]],
    ["accounts", ["accounts", "transactions", "recurring"]],
    ["categories", ["categories", "budgets"]],
    ["budgets", ["budgets"]],
    ["dashboard", ["dashboard"]],
    ["recurring", ["recurring"]],
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

describe("recurring edges", () => {
  it("a transaction or account change refreshes the recurring overview", async () => {
    await invalidate("transactions");
    expect(revalidated(keys.recurring)).toBe(true);
    mockedMutate.mockReset();
    await invalidate("accounts");
    expect(revalidated(keys.recurring)).toBe(true);
  });

  it("a rule change refreshes the recurring overview only, never the transaction list", async () => {
    await invalidate("recurring");
    expect(revalidated(keys.recurring)).toBe(true);
    expect(revalidated(keys.transactions)).toBe(false);
    expect(revalidated(keys.accounts)).toBe(false);
  });
});

describe("mutations refresh what they make stale", () => {
  it("archiving a rule refreshes the recurring overview", async () => {
    await archiveRule(id);
    expect(revalidated(keys.recurring)).toBe(true);
    expect(revalidated("/api/recurring")).toBe(true);
  });

  it("deleting a transaction refreshes budget usage, balances and the dashboard", async () => {
    await deleteTransaction(id);
    expect(revalidated(keys.budgets)).toBe(true);
    expect(revalidated(keys.dashboard)).toBe(true);
    expect(revalidated(keys.accounts)).toBe(true);
    expect(revalidated(`/api/transactions/${id}`)).toBe(false);
  });

  it("editing an account refreshes the transaction list, which may gain an adjustment", async () => {
    await updateAccount(id, { initialBalance: 100 });
    expect(revalidated(keys.transactions)).toBe(true);
    expect(revalidated(keys.accounts)).toBe(true);
    expect(revalidated(keys.dashboard)).toBe(false);
  });
});
