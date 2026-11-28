import { describe, expect, it } from "vitest";
import { accountsKey } from "@/hooks/use-accounts";
import { affectedBy } from "@/lib/cache-invalidation";
import { isResourceKey } from "@/lib/cache-invalidation";

describe("accounts SWR keys", () => {
  it("builds the active and archived keys from the contract", () => {
    expect(accountsKey()).toBe("/api/accounts");
    expect(accountsKey({ includeArchived: true })).toBe("/api/accounts?include=archived");
  });

  it.each(["/api/accounts", "/api/accounts?include=archived"])("revalidates %s", (key) => {
    expect(isResourceKey("accounts", key)).toBe(true);
  });

  it.each(["/api/categories", "/api/me", ["/api/accounts"], undefined])(
    "leaves %j alone",
    (key) => {
      expect(isResourceKey("accounts", key)).toBe(false);
    },
  );
});

describe("account reconciliation invalidation", () => {
  it("refreshes account balances and transaction history", () => {
    expect(affectedBy("accounts")).toContain("transactions");
  });
});
