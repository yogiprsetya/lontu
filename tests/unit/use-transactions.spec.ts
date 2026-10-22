import { describe, expect, it } from "vitest";
import { isTransactionsKey, transactionsPageKey } from "@/hooks/use-transactions";

describe("isTransactionsKey", () => {
  it.each([
    "/api/transactions",
    "/api/transactions?type=expense",
    "/api/transactions/totals?from=2026-10-01&to=2026-10-31",
    "$inf$/api/transactions?limit=30",
  ])("matches %s", (key) => {
    expect(isTransactionsKey(key)).toBe(true);
  });

  it.each([["/api/accounts"], ["/api/transactionsx"], [["/api/transactions"]], [undefined]])("does not match %j", (key) => {
    expect(isTransactionsKey(key)).toBe(false);
  });
});

describe("transactionsPageKey", () => {
  it("starts from the bare list URL", () => {
    expect(transactionsPageKey(0, null)).toBe("/api/transactions");
  });

  it("follows the previous page's cursor, encoded", () => {
    expect(transactionsPageKey(1, { items: [], nextCursor: "a+b/c=" })).toBe("/api/transactions?cursor=a%2Bb%2Fc%3D");
  });

  it("stops when the previous page had no next cursor", () => {
    expect(transactionsPageKey(1, { items: [], nextCursor: null })).toBeNull();
  });

  it("produces a key that isTransactionsKey matches, including the $inf$ form", () => {
    expect(isTransactionsKey(transactionsPageKey(0, null))).toBe(true);
    expect(isTransactionsKey(`$inf$${transactionsPageKey(0, null)}`)).toBe(true);
  });
});

describe("transactionsPageKey with filters", () => {
  const filters = { period: "2026-10", type: "expense" } as const;

  it("puts the filter query on the first page", () => {
    expect(transactionsPageKey(0, null, filters)).toBe("/api/transactions?type=expense&from=2026-10-01&to=2026-10-31");
  });

  it("appends the cursor after the filter query", () => {
    expect(transactionsPageKey(1, { items: [], nextCursor: "abc" }, filters)).toBe(
      "/api/transactions?type=expense&from=2026-10-01&to=2026-10-31&cursor=abc",
    );
  });

  it("is the same key for equal filters", () => {
    expect(transactionsPageKey(0, null, { type: "expense", period: "2026-10" })).toBe(transactionsPageKey(0, null, filters));
  });
});
