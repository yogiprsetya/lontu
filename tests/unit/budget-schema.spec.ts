import { afterEach, describe, expect, it, vi } from "vitest";
import { budgetCreateSchema, budgetUpdateSchema } from "@/lib/schemas/budget";
import { budgetUsageQuerySchema } from "@/lib/schemas/budget-usage";

const jajan = "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b";
const hiburan = "3a4b5c6d-7e8f-4a0b-9c2d-3e4f5a6b7c8d";

afterEach(() => {
  vi.useRealTimers();
});

describe("budgetUsageQuerySchema", () => {
  it("stops at the current month in Jakarta", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    // 17:30 UTC on 31 October is already 1 November in Jakarta.
    vi.setSystemTime(new Date("2026-10-31T17:30:00Z"));
    expect(budgetUsageQuerySchema.safeParse({ period: "2026-11" }).success).toBe(true);
    expect(budgetUsageQuerySchema.safeParse({ period: "2026-12" }).success).toBe(false);
  });

  it("crosses the year boundary", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-31T17:30:00Z"));
    expect(budgetUsageQuerySchema.safeParse({ period: "2027-01" }).success).toBe(true);
    expect(budgetUsageQuerySchema.safeParse({ period: "2027-02" }).success).toBe(false);
  });

  it.each(["2026-13", "1999-12", "26-10", ""])("rejects %j", (period) => {
    expect(budgetUsageQuerySchema.safeParse({ period }).success).toBe(false);
  });
});

describe("budgetCreateSchema", () => {
  const body = { name: " Jajan ", spendingType: "wants", amount: 0, categoryIds: [jajan, hiburan] };

  it("accepts a valid body, trimming the name, with a zero amount", () => {
    expect(budgetCreateSchema.parse(body)).toEqual({ ...body, name: "Jajan" });
  });

  it.each([
    { amount: 1e12 + 1 },
    { categoryIds: [jajan, jajan] },
    { userId: "x" },
    { period: "2026-10" },
  ])("rejects %j", (patch) => {
    expect(budgetCreateSchema.safeParse({ ...body, ...patch }).success).toBe(false);
  });
});

describe("budgetUpdateSchema", () => {
  it("accepts any one field", () => {
    expect(budgetUpdateSchema.safeParse({ amount: 1 }).success).toBe(true);
  });

  it.each([{}, { spendingType: "needs" }, { name: "   " }])("rejects %j", (body) => {
    expect(budgetUpdateSchema.safeParse(body).success).toBe(false);
  });
});
