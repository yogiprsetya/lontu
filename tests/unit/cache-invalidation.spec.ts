import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("swr", async (importOriginal) => ({ ...(await importOriginal<typeof import("swr")>()), mutate: vi.fn() }));

const { mutate } = await import("swr");
const { affectedBy, apiKey, invalidate, isResourceKey, removeOptimistically } = await import("@/lib/cache-invalidation");
const { deleteTransaction, transactionKey, transactionsPageKey, transactionsTotalsKey } = await import("@/hooks/use-transactions");
const { accountsKey, updateAccount } = await import("@/hooks/use-accounts");
const { categoriesKey } = await import("@/hooks/use-categories");
const { budgetSuggestionKey, budgetsKey } = await import("@/hooks/use-budgets");
const { dashboardKey } = await import("@/hooks/use-dashboard");
const { archiveRule, recurringKey } = await import("@/hooks/use-recurring");

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

describe("apiKey", () => {
  it("is the resource's base path without options", () => {
    expect(apiKey("accounts")).toBe("/api/accounts");
    expect(apiKey("dashboard")).toBe("/api/dashboard");
  });

  it("appends a sub-path and the query in the given order", () => {
    expect(apiKey("budgets", { path: "suggestion", query: { period: "2026-10", income: 100 } })).toBe(
      "/api/budgets/suggestion?period=2026-10&income=100",
    );
    expect(apiKey("transactions", { path: id })).toBe(`/api/transactions/${id}`);
  });

  it("drops undefined values but keeps zero", () => {
    expect(apiKey("budgets", { path: "suggestion", query: { period: "2026-10", income: undefined } })).toBe(
      "/api/budgets/suggestion?period=2026-10",
    );
    expect(apiKey("budgets", { path: "suggestion", query: { period: "2026-10", income: 0 } })).toBe(
      "/api/budgets/suggestion?period=2026-10&income=0",
    );
  });

  it("takes URLSearchParams as is", () => {
    expect(apiKey("transactions", { query: new URLSearchParams("type=expense&from=2026-10-01") })).toBe(
      "/api/transactions?type=expense&from=2026-10-01",
    );
    expect(apiKey("transactions", { query: new URLSearchParams() })).toBe("/api/transactions");
  });
});

describe("every key a hook builds matches its resource and no other", () => {
  const filters = { period: "2026-10", type: "expense", accountId: id } as const;
  const built = [
    ["accounts", accountsKey()],
    ["accounts", accountsKey({ includeArchived: true })],
    ["categories", categoriesKey()],
    ["categories", categoriesKey({ includeArchived: true })],
    ["budgets", budgetsKey("2026-10")],
    ["budgets", budgetSuggestionKey("2026-10")],
    ["budgets", budgetSuggestionKey("2026-10", 0)],
    ["dashboard", dashboardKey("2026-10")],
    ["dashboard", dashboardKey("2026")],
    ["recurring", recurringKey()],
    ["recurring", recurringKey({ includeArchived: true })],
    ["transactions", transactionsPageKey(0, null, filters)!],
    ["transactions", `$inf$${transactionsPageKey(0, null, filters)}`],
    ["transactions", transactionsPageKey(0, null, { period: "all" })!],
    ["transactions", transactionsPageKey(1, { items: [], nextCursor: "abc" }, filters)!],
    ["transactions", transactionsTotalsKey(filters)],
    ["transactions", transactionKey(id)],
  ] as const;
  const resources = ["accounts", "categories", "transactions", "budgets", "dashboard", "recurring"] as const;

  it.each(built)("%s: %s", (resource, key) => {
    for (const other of resources) expect(isResourceKey(other, key)).toBe(other === resource);
  });
});

describe("removeOptimistically", () => {
  const detail = `/api/transactions/${id}`;
  const update = (rows?: string[]) => rows?.filter((row) => row !== id);

  it("updates the cache without revalidating, then sends, then invalidates all but `except`", async () => {
    const order: string[] = [];
    mockedMutate.mockImplementation(async (...args: unknown[]) => {
      order.push(args.length === 3 ? "update" : "invalidate");
    });
    const result = await removeOptimistically({
      match: keys.budgets,
      update,
      send: async () => {
        order.push("send");
        return "deleted";
      },
      resource: "transactions",
      except: detail,
    });
    expect(result).toBe("deleted");
    expect(order).toEqual(["update", "send", "invalidate"]);
    expect(mockedMutate.mock.calls[0]).toEqual([keys.budgets, update, { revalidate: false }]);
    expect(revalidated(keys.transactions)).toBe(true);
    expect(revalidated(detail)).toBe(false);
  });

  it("revalidates everything, `except` included, and rethrows when the send fails", async () => {
    const failure = new Error("refused");
    await expect(
      removeOptimistically({
        match: keys.budgets,
        update,
        send: () => Promise.reject(failure),
        resource: "transactions",
        except: detail,
      }),
    ).rejects.toBe(failure);
    expect(mockedMutate).toHaveBeenCalledTimes(2);
    expect(revalidated(keys.transactions)).toBe(true);
    expect(revalidated(detail)).toBe(true);
  });
});
