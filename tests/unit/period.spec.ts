import { describe, expect, it } from "vitest";
import {
  addDays,
  clampDay,
  daysBetween,
  formatPeriodLabel,
  isPastOrCurrentPeriod,
  lastDayOfMonth,
  MIN_PERIOD_YEAR,
  monthRange,
  parsePeriod,
  periodMode,
  periodToRange,
  periodToYearMonth,
  previousPeriod,
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

describe("parsePeriod", () => {
  const today = "2026-10-23";

  describe("transactions: month, year or all, no upper bound", () => {
    const parse = (value: string | null) => parsePeriod(value, { modes: ["month", "year", "all"], today });

    it.each(["2026-10", "2026", "all", "2000", "2000-01", "2027-03"])("keeps %s", (value) => {
      expect(parse(value)).toBe(value);
    });

    it.each([null, "", "1999", "0001", "1999-12", "2026-13", "2026-00", "2026-1", "26", "abc", "2026-10-01"])(
      "falls back to the current month for %j",
      (value) => {
        expect(parse(value)).toBe("2026-10");
      },
    );
  });

  describe("budgets: month only, up to next month", () => {
    const parse = (value: string | null, now = today) =>
      parsePeriod(value, { modes: ["month"], today: now, max: shiftPeriod(now.slice(0, 7), 1) });

    it.each(["2026-10", "2026-11", "2000-01"])("keeps %s", (value) => {
      expect(parse(value)).toBe(value);
    });

    it.each([null, "2026-12", "1999-12", "2026-13", "2026", "all"])("falls back to the current month for %j", (value) => {
      expect(parse(value)).toBe("2026-10");
    });

    it("allows January next year in December", () => {
      expect(parse("2027-01", "2026-12-31")).toBe("2027-01");
    });
  });

  describe("dashboard: month or year, not after today", () => {
    const parse = (value: string | null) => parsePeriod(value, { modes: ["month", "year"], today, max: today });

    it.each(["2026-10", "2026", "2000", "2000-01"])("keeps %s", (value) => {
      expect(parse(value)).toBe(value);
    });

    it.each([null, "all", "2026-11", "2027", "2099", "1999", "1999-12", "2026-13"])(
      "falls back to the current month for %j",
      (value) => {
        expect(parse(value)).toBe("2026-10");
      },
    );
  });
});

describe("isPastOrCurrentPeriod", () => {
  it.each([
    ["2026-10", true],
    ["2026-09", true],
    ["2026", true],
    ["2000-01", true],
    ["2026-11", false],
    ["2027", false],
    ["1999-12", false],
    ["1999", false],
  ])("%s → %s", (period, expected) => {
    expect(isPastOrCurrentPeriod(period, "2026-10-23")).toBe(expected);
  });
});

describe("previousPeriod (no lower bound)", () => {
  it.each([
    ["2026-10", "2026-09"],
    ["2026-01", "2025-12"],
    ["2000-01", "1999-12"],
    ["2026", "2025"],
    ["2000", "1999"],
  ])("%s → %s", (period, previous) => {
    expect(previousPeriod(period)).toBe(previous);
  });

  it("agrees with shiftPeriod above the floor", () => {
    for (const period of ["2026-10", "2026-01", "2000-02", "2026", "2001"]) {
      expect(previousPeriod(period)).toBe(shiftPeriod(period, -1));
    }
  });
});

describe("MIN_PERIOD_YEAR", () => {
  it("is the first year a period can name, matching the earliest transaction date", () => {
    expect(MIN_PERIOD_YEAR).toBe(2000);
    expect(shiftPeriod(`${MIN_PERIOD_YEAR}-01`, -1)).toBe(`${MIN_PERIOD_YEAR}-01`);
  });
});

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

describe("daysBetween", () => {
  it("counts calendar days across a month and a year end", () => {
    expect(daysBetween("2026-10-25", "2026-10-27")).toBe(2);
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1);
    expect(daysBetween("2026-11-13", "2026-11-25")).toBe(12);
  });
});

describe("lastDayOfMonth", () => {
  it.each([
    [2026, 1, 31],
    [2026, 2, 28],
    [2028, 2, 29],
    [2100, 2, 28],
    [2000, 2, 29],
    [2026, 4, 30],
    [2026, 12, 31],
  ])("%i-%i → %i", (year, month, day) => {
    expect(lastDayOfMonth(year, month)).toBe(day);
  });
});

describe("addDays", () => {
  it.each([
    ["2026-10-23", -1, "2026-10-22"],
    ["2026-10-01", -1, "2026-09-30"],
    ["2026-01-01", -1, "2025-12-31"],
    ["2028-03-01", -1, "2028-02-29"],
    ["2026-12-31", 1, "2027-01-01"],
    ["2026-10-23", 10, "2026-11-02"],
  ])("%s %+i → %s", (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });
});
