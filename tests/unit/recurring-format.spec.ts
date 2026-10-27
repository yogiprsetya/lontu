import { describe, expect, it } from "vitest";
import { formatDueLabel, formatSchedule } from "@/lib/recurring-format";

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
