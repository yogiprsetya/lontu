import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  budgetPeriodSchema,
  budgetSetSchema,
} from "@/lib/schemas/budget";

const makan = "1f2e3d4c-5b6a-4978-8a6b-5c4d3e2f1a0b";
const hiburan = "3a4b5c6d-7e8f-4a0b-9c2d-3e4f5a6b7c8d";

function fieldErrors(result: { success: boolean; error?: z.ZodError }) {
  expect(result.success).toBe(false);
  return z.flattenError(result.error!) as { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> };
}

function setBody(overrides: Record<string, unknown> = {}) {
  return { period: "2026-10", items: [{ categoryId: makan, amount: 1_500_000 }], ...overrides };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("budgetPeriodSchema", () => {
  beforeEach(() => {
    // 00:30 on 1 Nov in Jakarta, still 31 Oct in UTC: next month is already December.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-31T17:30:00Z"));
  });

  it.each(["2000-01", "2026-10", "2026-11", "2026-12"])("accepts %s", (period) => {
    expect(budgetPeriodSchema.parse(period)).toBe(period);
  });

  it.each(["2026-13", "2026-00", "2026-1", "1999-12", "2027-01", "2026-10-01", ""])("rejects %j", (period) => {
    expect(budgetPeriodSchema.safeParse(period).success).toBe(false);
  });

  it("allows January of next year in December", () => {
    vi.setSystemTime(new Date("2026-12-15T05:00:00Z"));
    expect(budgetPeriodSchema.safeParse("2027-01").success).toBe(true);
    expect(budgetPeriodSchema.safeParse("2027-02").success).toBe(false);
  });
});

describe("budgetSetSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-23T05:00:00Z"));
  });

  it("accepts a valid body, including a zero amount and 1e12", () => {
    const body = setBody({ items: [{ categoryId: makan, amount: 0 }, { categoryId: hiburan, amount: 1e12 }] });
    expect(budgetSetSchema.parse(body)).toEqual(body);
  });

  it("reports an invalid period under fields.period", () => {
    expect(fieldErrors(budgetSetSchema.safeParse(setBody({ period: "2026-13" }))).fieldErrors.period).toBeDefined();
  });

  it.each([[[]], [Array.from({ length: 101 }, () => ({ categoryId: makan, amount: 1 }))]])(
    "rejects %# items length under fields.items",
    (items) => {
      expect(fieldErrors(budgetSetSchema.safeParse(setBody({ items }))).fieldErrors.items).toBeDefined();
    },
  );

  it("rejects a duplicate categoryId under fields.items", () => {
    const items = [{ categoryId: makan, amount: 1 }, { categoryId: makan, amount: 2 }];
    expect(fieldErrors(budgetSetSchema.safeParse(setBody({ items }))).fieldErrors.items).toEqual([
      "Kategori tidak boleh ganda",
    ]);
  });

  it.each([-1, 1.5, "100", 1e12 + 1])("rejects amount %j under fields.items", (amount) => {
    const items = [{ categoryId: makan, amount }];
    expect(fieldErrors(budgetSetSchema.safeParse(setBody({ items }))).fieldErrors.items).toBeDefined();
  });

  it("rejects a categoryId that is not a UUID", () => {
    const items = [{ categoryId: "1", amount: 1 }];
    expect(fieldErrors(budgetSetSchema.safeParse(setBody({ items }))).fieldErrors.items).toBeDefined();
  });

  it.each([{ userId: "test-x" }, { year: 2026 }])("rejects unknown field %j", (extra) => {
    expect(fieldErrors(budgetSetSchema.safeParse(setBody(extra))).formErrors[0]).toMatch(/Unrecognized key/);
  });

  it("rejects an unknown field inside an item", () => {
    const items = [{ categoryId: makan, amount: 1, userId: "test-x" }];
    expect(budgetSetSchema.safeParse(setBody({ items })).success).toBe(false);
  });
});
