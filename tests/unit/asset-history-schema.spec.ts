import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { assetHistoryQuerySchema } from "@/lib/schemas/asset-history";

describe("assetHistoryQuerySchema", () => {
  it("defaults range to 12 and leaves accountId out", () => {
    expect(assetHistoryQuerySchema.parse({})).toEqual({ range: "12" });
  });

  it.each(["6", "12", "all"])("accepts range %s", (range) => {
    expect(assetHistoryQuerySchema.parse({ range }).range).toBe(range);
  });

  it.each(["24", "", "ALL", "3"])("rejects range %j on the range field", (range) => {
    const result = assetHistoryQuerySchema.safeParse({ range });
    expect(result.success).toBe(false);
    expect(z.flattenError(result.error!).fieldErrors.range).toBeDefined();
  });

  it("accepts a uuid accountId", () => {
    const accountId = randomUUID();
    expect(assetHistoryQuerySchema.parse({ accountId })).toEqual({ range: "12", accountId });
  });

  it("rejects a non-uuid accountId on the accountId field", () => {
    const result = assetHistoryQuerySchema.safeParse({ accountId: "abc" });
    expect(result.success).toBe(false);
    expect(z.flattenError(result.error!).fieldErrors.accountId).toBeDefined();
  });
});
