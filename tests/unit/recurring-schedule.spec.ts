import { describe, expect, it } from "vitest";
import { advanceDate, clampDay, daysBetween, firstDueOnOrAfter } from "@/lib/recurring-schedule";

describe("clampDay", () => {
  it("keeps a day that exists in the month", () => {
    expect(clampDay(2026, 10, 5)).toBe("2026-10-05");
  });

  it("clamps to the last day of a short month", () => {
    expect(clampDay(2027, 2, 31)).toBe("2027-02-28");
    expect(clampDay(2026, 11, 31)).toBe("2026-11-30");
  });

  it("allows 29 February in a leap year", () => {
    expect(clampDay(2028, 2, 31)).toBe("2028-02-29");
  });
});

describe("advanceDate", () => {
  it("keeps the anchor across a short month instead of drifting to 28", () => {
    const feb = advanceDate(31, "2026-01-31");
    expect(feb).toBe("2026-02-28");
    expect(advanceDate(31, feb)).toBe("2026-03-31");
  });

  it("lands on 29 February in a leap year", () => {
    expect(advanceDate(29, "2028-01-29")).toBe("2028-02-29");
  });

  it("rolls December over to January of the next year", () => {
    expect(advanceDate(15, "2026-12-15")).toBe("2027-01-15");
  });
});

describe("firstDueOnOrAfter", () => {
  it("includes today when the anchor is today", () => {
    expect(firstDueOnOrAfter(27, "2026-10-27")).toBe("2026-10-27");
  });

  it("moves to next month when this month's anchor has passed", () => {
    expect(firstDueOnOrAfter(5, "2026-10-27")).toBe("2026-11-05");
  });

  it("uses the last day of this month when the anchor is past it", () => {
    expect(firstDueOnOrAfter(31, "2026-11-03")).toBe("2026-11-30");
  });

  it("rolls over the year end", () => {
    expect(firstDueOnOrAfter(1, "2026-12-02")).toBe("2027-01-01");
  });
});

describe("daysBetween", () => {
  it("counts calendar days across a month and a year end", () => {
    expect(daysBetween("2026-10-25", "2026-10-27")).toBe(2);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-11-13", "2026-11-25")).toBe(12);
  });
});
