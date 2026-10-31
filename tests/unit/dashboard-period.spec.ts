import { describe, expect, it } from "vitest";
import { dashboardMode, dashboardPeriodFromParam, dashboardRanges } from "@/lib/dashboard-period";

describe("dashboardMode", () => {
  it("tells months from years", () => {
    expect(dashboardMode("2026-10")).toBe("month");
    expect(dashboardMode("2026")).toBe("year");
  });
});

describe("dashboardRanges, month", () => {
  it("cuts the current month and the previous one at today", () => {
    expect(dashboardRanges("2026-10", "2026-10-25")).toEqual({
      range: { from: "2026-10-01", to: "2026-10-25" },
      previous: { period: "2026-09", range: { from: "2026-09-01", to: "2026-09-25" } },
    });
  });

  it("clamps to the last day of a shorter previous month", () => {
    expect(dashboardRanges("2026-10", "2026-10-31").previous.range).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(dashboardRanges("2028-03", "2028-03-31").previous.range).toEqual({
      from: "2028-02-01",
      to: "2028-02-29",
    });
    expect(dashboardRanges("2026-03", "2026-03-30").previous.range).toEqual({
      from: "2026-02-01",
      to: "2026-02-28",
    });
  });

  it("compares a past month in full with the full month before it", () => {
    expect(dashboardRanges("2026-09", "2026-10-25")).toEqual({
      range: { from: "2026-09-01", to: "2026-09-30" },
      previous: { period: "2026-08", range: { from: "2026-08-01", to: "2026-08-31" } },
    });
  });

  it("steps back over the year boundary", () => {
    expect(dashboardRanges("2026-01", "2026-01-15").previous).toEqual({
      period: "2025-12",
      range: { from: "2025-12-01", to: "2025-12-15" },
    });
  });

  it("compares January 2000 with December 1999, which can hold no transactions", () => {
    expect(dashboardRanges("2000-01", "2026-10-25").previous).toEqual({
      period: "1999-12",
      range: { from: "1999-12-01", to: "1999-12-31" },
    });
  });
});

describe("dashboardRanges, year", () => {
  it("cuts the current year at today and last year at the same day, 29 Feb to 28 Feb", () => {
    expect(dashboardRanges("2028", "2028-02-29")).toEqual({
      range: { from: "2028-01-01", to: "2028-02-29" },
      previous: { period: "2027", range: { from: "2027-01-01", to: "2027-02-28" } },
    });
  });

  it("compares a past year in full", () => {
    expect(dashboardRanges("2025", "2026-10-25")).toEqual({
      range: { from: "2025-01-01", to: "2025-12-31" },
      previous: { period: "2024", range: { from: "2024-01-01", to: "2024-12-31" } },
    });
  });

  it("compares 2000 with 1999", () => {
    expect(dashboardRanges("2000", "2026-10-25").previous).toEqual({
      period: "1999",
      range: { from: "1999-01-01", to: "1999-12-31" },
    });
  });
});

describe("dashboardPeriodFromParam", () => {
  it.each(["2026-10", "2026-01", "2026", "2000", "2000-01"])("keeps %s", (value) => {
    expect(dashboardPeriodFromParam(value, "2026-10-25")).toBe(value);
  });

  it.each([null, "", "all", "2026-11", "2027", "1999", "1999-12", "2026-13", "26-10"])(
    "falls back to the current month for %j",
    (value) => {
      expect(dashboardPeriodFromParam(value, "2026-10-25")).toBe("2026-10");
    },
  );
});
