import { describe, expect, it } from "vitest";
import {
  formatPeriodLabel,
  monthRange,
  periodMode,
  periodToRange,
  periodToYearMonth,
  shiftPeriod,
  switchPeriodMode,
  yearMonthToPeriod,
} from "@/lib/period";

const TODAY = "2026-10-22";

describe("periodToRange", () => {
  it.each([
    ["2026-10", { from: "2026-10-01", to: "2026-10-31" }],
    ["2026-12", { from: "2026-12-01", to: "2026-12-31" }],
    ["2028-02", { from: "2028-02-01", to: "2028-02-29" }],
    ["2026-02", { from: "2026-02-01", to: "2026-02-28" }],
    ["2026-04", { from: "2026-04-01", to: "2026-04-30" }],
    ["2026", { from: "2026-01-01", to: "2026-12-31" }],
    ["all", {}],
  ])("%s", (period, range) => {
    expect(periodToRange(period)).toEqual(range);
  });
});

describe("period navigation", () => {
  it("shifts months across year boundaries", () => {
    expect(shiftPeriod("2026-12", 1)).toBe("2027-01");
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
    expect(shiftPeriod("2026-10", -1)).toBe("2026-09");
  });

  it("shifts years and leaves all-time alone", () => {
    expect(shiftPeriod("2026", -1)).toBe("2025");
    expect(shiftPeriod("all", 1)).toBe("all");
  });

  it("reports the mode", () => {
    expect([periodMode("2026-10"), periodMode("2026"), periodMode("all")]).toEqual(["month", "year", "all"]);
  });

  it("switches mode keeping the year when possible", () => {
    expect(switchPeriodMode("2025-03", "year", TODAY)).toBe("2025");
    expect(switchPeriodMode("2025", "month", TODAY)).toBe("2025-01");
    expect(switchPeriodMode("2026", "month", TODAY)).toBe("2026-10");
    expect(switchPeriodMode("all", "month", TODAY)).toBe("2026-10");
    expect(switchPeriodMode("all", "year", TODAY)).toBe("2026");
    expect(switchPeriodMode("2025-03", "all", TODAY)).toBe("all");
  });

  it("labels periods in Indonesian", () => {
    expect(formatPeriodLabel("2026-10")).toBe("Oktober 2026");
    expect(formatPeriodLabel("2026")).toBe("2026");
    expect(formatPeriodLabel("all")).toBe("Semua");
  });
});

describe("period lower bound", () => {
  it("does not step before January 2000", () => {
    expect(shiftPeriod("2000-01", -1)).toBe("2000-01");
    expect(shiftPeriod("2000", -1)).toBe("2000");
    expect(shiftPeriod("2000-02", -1)).toBe("2000-01");
  });

  it("always yields a four-digit year", () => {
    expect(shiftPeriod("2001", -1)).toBe("2000");
    expect(periodMode(shiftPeriod("2000-01", -1))).toBe("month");
  });
});

describe("period helpers", () => {
  it("converts between period and year/month", () => {
    expect(periodToYearMonth("2026-03")).toEqual({ year: 2026, month: 3 });
    expect(yearMonthToPeriod(2026, 3)).toBe("2026-03");
    expect(yearMonthToPeriod(2026, 12)).toBe("2026-12");
  });

  it.each([
    ["2028-02", "2028-02-01", "2028-02-29"],
    ["2026-02", "2026-02-01", "2026-02-28"],
    ["2026-10", "2026-10-01", "2026-10-31"],
    ["2026-11", "2026-11-01", "2026-11-30"],
  ])("monthRange(%s) is %s..%s", (period, from, to) => {
    expect(monthRange(period)).toEqual({ from, to });
  });
});
