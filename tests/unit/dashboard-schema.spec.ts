import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { dashboardPeriodSchema, dashboardQuerySchema } from "@/lib/schemas/dashboard";

afterEach(() => {
  vi.useRealTimers();
});

describe("dashboardPeriodSchema", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-25T05:00:00Z"));
  });

  it.each(["2000-01", "2000", "2026-09", "2026-10", "2025", "2026"])("accepts %s", (period) => {
    expect(dashboardPeriodSchema.parse(period)).toBe(period);
  });

  it.each(["", "2026-13", "2026-00", "26-10", "1999", "1999-12", "2026-11", "2027", "all", "2026-10-01"])(
    "rejects %j",
    (period) => {
      expect(dashboardPeriodSchema.safeParse(period).success).toBe(false);
    },
  );

  it("reads today in Jakarta, so 31 Dec 18:00 UTC already allows the new year", () => {
    vi.setSystemTime(new Date("2026-12-31T16:00:00Z"));
    expect(dashboardPeriodSchema.safeParse("2027").success).toBe(false);
    expect(dashboardPeriodSchema.safeParse("2027-01").success).toBe(false);
    vi.setSystemTime(new Date("2026-12-31T18:00:00Z"));
    expect(dashboardPeriodSchema.safeParse("2027").success).toBe(true);
    expect(dashboardPeriodSchema.safeParse("2027-01").success).toBe(true);
    expect(dashboardPeriodSchema.safeParse("2027-02").success).toBe(false);
  });
});

describe("dashboardQuerySchema", () => {
  it("reports a missing period on fields.period", () => {
    const result = dashboardQuerySchema.safeParse({});
    expect(result.success).toBe(false);
    expect(z.flattenError(result.error!).fieldErrors).toHaveProperty("period");
  });
});
