import { describe, expect, it } from "vitest";
import { dateFromValue, formatLongDate, greetingInJakarta, valueFromDate } from "@/lib/date";

describe("greetingInJakarta", () => {
  it.each([
    ["2026-10-26T21:00:00Z", "Selamat pagi"], // 04:00 WIB
    ["2026-10-27T03:59:00Z", "Selamat pagi"], // 10:59 WIB
    ["2026-10-27T04:00:00Z", "Selamat siang"], // 11:00 WIB
    ["2026-10-27T07:59:00Z", "Selamat siang"], // 14:59 WIB
    ["2026-10-27T08:00:00Z", "Selamat sore"], // 15:00 WIB
    ["2026-10-27T10:59:00Z", "Selamat sore"], // 17:59 WIB
    ["2026-10-27T11:00:00Z", "Selamat malam"], // 18:00 WIB
    ["2026-10-26T17:00:00Z", "Selamat malam"], // 00:00 WIB
    ["2026-10-26T20:59:00Z", "Selamat malam"], // 03:59 WIB
  ])("at %s says %s", (iso, expected) => {
    expect(greetingInJakarta(new Date(iso))).toBe(expected);
  });
});

describe("calendar date conversion", () => {
  it("reads YYYY-MM-DD as that local calendar day", () => {
    const date = dateFromValue("2026-03-09");
    expect([date?.getFullYear(), date?.getMonth(), date?.getDate()]).toEqual([2026, 2, 9]);
  });

  it.each(["", "2026-3-9", "not-a-date"])("returns undefined for %j", (value) => {
    expect(dateFromValue(value)).toBeUndefined();
  });

  it("writes a local Date back as YYYY-MM-DD", () => {
    expect(valueFromDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });

  it("round-trips", () => {
    expect(valueFromDate(dateFromValue("2000-12-31")!)).toBe("2000-12-31");
  });
});

describe("formatLongDate", () => {
  it("names the weekday, day, month and year in Indonesian", () => {
    expect(formatLongDate("2026-11-02")).toBe("Senin, 2 November 2026");
  });
});
