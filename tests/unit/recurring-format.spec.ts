import { describe, expect, it } from "vitest";
import { formatDueLabel, formatFree, formatLateness, formatPaydayHeadline, formatSchedule } from "@/lib/recurring-format";

describe("formatSchedule", () => {
  it("shows the amount and the anchor day", () => {
    expect(formatSchedule(186_000, 25, false)).toBe("Rp186.000 · tiap tanggal 25");
  });

  it("hides the amount when asked", () => {
    expect(formatSchedule(186_000, 25, true)).toBe("Rp••••• · tiap tanggal 25");
  });
});

describe("formatDueLabel", () => {
  it("says today for a rule due today", () => {
    expect(formatDueLabel("2026-10-27", "2026-10-27")).toEqual({ text: "Hari ini", overdue: false });
  });

  it("shows the day and short month for a future date", () => {
    expect(formatDueLabel("2026-11-25", "2026-10-27")).toEqual({ text: "25 Nov", overdue: false });
  });

  it("marks a past date as late in words, not only color", () => {
    expect(formatDueLabel("2026-10-25", "2026-10-27")).toEqual({ text: "Terlambat · 25 Okt", overdue: true });
  });

  it("adds the year when it differs from this year", () => {
    expect(formatDueLabel("2027-01-05", "2026-12-20").text).toBe("5 Jan 2027");
  });
});

describe("formatLateness", () => {
  it("says hari ini for an occurrence due today", () => {
    expect(formatLateness("2026-10-27", "2026-10-27")).toBe("hari ini");
  });

  it("counts the days late in words", () => {
    expect(formatLateness("2026-10-24", "2026-10-27")).toBe("terlambat 3 hari");
  });
});

describe("formatPaydayHeadline", () => {
  it("counts down to payday with its date", () => {
    expect(formatPaydayHeadline({ payday: "2026-11-25", daysLeft: 12 }, "2026-11-13")).toBe("12 hari lagi gajian (25 Nov)");
  });

  it("says besok the day before", () => {
    expect(formatPaydayHeadline({ payday: "2026-11-25", daysLeft: 1 }, "2026-11-24")).toBe("Besok gajian (25 Nov)");
  });
});

describe("formatFree", () => {
  it("shows a positive amount as is", () => {
    expect(formatFree(2_014_000, false)).toEqual({ label: "Bebas", amount: "Rp2.014.000", short: false });
  });

  it("spells out a shortfall instead of a minus sign", () => {
    expect(formatFree(-800_000, false)).toEqual({ label: "Kurang", amount: "Rp800.000", short: true });
  });

  it("hides the amount but keeps the label", () => {
    expect(formatFree(-800_000, true)).toEqual({ label: "Kurang", amount: "Rp•••••", short: true });
  });
});
