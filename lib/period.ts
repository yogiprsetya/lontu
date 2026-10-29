/** `YYYY-MM`, `YYYY` or `all`. Lives only in the page URL; the API takes `from`/`to`. */
export type Period = string;

export type PeriodMode = "month" | "year" | "all";

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const YEAR = /^\d{4}$/;

const monthLabel = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "long", year: "numeric" });

export function periodMode(period: Period): PeriodMode {
  if (period === "all") return "all";
  return YEAR.test(period) ? "year" : "month";
}

// Matches MIN_TRANSACTION_DATE: nothing can be recorded earlier, and a shorter year would parse as another mode.
const MIN_YEAR = 2000;

export function isPeriod(value: string | null): value is Period {
  if (value === null) return false;
  if (value === "all") return true;
  return (YEAR.test(value) || MONTH.test(value)) && Number(value.slice(0, 4)) >= MIN_YEAR;
}

export function periodToRange(period: Period): { from?: string; to?: string } {
  if (period === "all") return {};
  if (YEAR.test(period)) return { from: `${period}-01-01`, to: `${period}-12-31` };
  const [, year, month] = MONTH.exec(period) ?? [];
  if (!year) return {};
  // Day 0 of the next month is the last day of this one, leap years included.
  const lastDay = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  return { from: `${period}-01`, to: `${period}-${String(lastDay).padStart(2, "0")}` };
}

export function shiftPeriod(period: Period, delta: 1 | -1): Period {
  if (period === "all") return period;
  if (YEAR.test(period)) {
    const year = Number(period) + delta;
    return year < MIN_YEAR ? period : String(year);
  }
  const [, year, month] = MONTH.exec(period) ?? [];
  const index = Number(year) * 12 + (Number(month) - 1) + delta;
  if (Math.floor(index / 12) < MIN_YEAR) return period;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

export function switchPeriodMode(period: Period, mode: PeriodMode, today: string): Period {
  if (mode === "all") return "all";
  const current = periodMode(period);
  if (current === mode) return period;
  const year = period === "all" ? today.slice(0, 4) : period.slice(0, 4);
  if (mode === "year") return year;
  return year === today.slice(0, 4) ? today.slice(0, 7) : `${year}-01`;
}

export function formatPeriodLabel(period: Period) {
  if (period === "all") return "Semua";
  if (YEAR.test(period)) return period;
  return monthLabel.format(new Date(`${period}-01T00:00:00Z`));
}

export function periodToYearMonth(period: Period) {
  return { year: Number(period.slice(0, 4)), month: Number(period.slice(5, 7)) };
}

export function yearMonthToPeriod(year: number, month: number): Period {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** First and last day of the month as `YYYY-MM-DD`. */
export function monthRange(period: Period) {
  const { from, to } = periodToRange(period);
  return { from: from!, to: to! };
}
