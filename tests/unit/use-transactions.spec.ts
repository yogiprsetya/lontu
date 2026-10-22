import { describe, expect, it } from "vitest";
import { isTransactionsKey } from "@/hooks/use-transactions";

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
