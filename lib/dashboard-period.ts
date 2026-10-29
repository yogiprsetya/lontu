import { parsePeriod, periodToRange } from "@/lib/period";
import type { DashboardMode, DashboardPeriod, DateRange } from "@/lib/schemas/dashboard";

export function dashboardMode(period: DashboardPeriod): DashboardMode {
  return period.length === 4 ? "year" : "month";
}

/** `?period=` from the page URL; anything the API would reject falls back to the current month. */
export function dashboardPeriodFromParam(value: string | null, today: string): DashboardPeriod {
  return parsePeriod(value, { modes: ["month", "year"], today, max: today });
}

// Not `shiftPeriod`: that one stops at 2000, while January 2000 still needs December 1999
// to compare against. No transaction can be dated there, so its totals are simply 0.
function previousPeriod(period: DashboardPeriod): DashboardPeriod {
  if (dashboardMode(period) === "year") return String(Number(period) - 1);
  const index = Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7)) - 2;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

function fullRange(period: DashboardPeriod): DateRange {
  const { from, to } = periodToRange(period);
  return { from: from!, to: to! };
}

/**
 * The period and the one before it, period-to-date: while `period` contains `today`, both
 * stop at the same day of their period, clamped to the last day of a shorter month.
 */
export function dashboardRanges(period: DashboardPeriod, today: string) {
  const range = fullRange(period);
  const prev = previousPeriod(period);
  const previous = { period: prev, range: fullRange(prev) };
  if (today < range.from || today > range.to) return { range, previous };

  const sameMonthBefore = dashboardMode(period) === "year" ? `${prev}-${today.slice(5, 7)}` : prev;
  const sameDay = `${sameMonthBefore}-${today.slice(8, 10)}`;
  const lastDay = fullRange(sameMonthBefore).to;
  return {
    range: { from: range.from, to: today },
    previous: { period: prev, range: { from: previous.range.from, to: sameDay < lastDay ? sameDay : lastDay } },
  };
}
