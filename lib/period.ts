/** `YYYY-MM`, `YYYY` or `all`. Lives only in the page URL; the API takes `from`/`to`. */
export type Period = string;

export type PeriodMode = "month" | "year" | "all";

/** `YYYY-MM`. */
export type MonthPeriod = Period;

/** `YYYY-MM` or `YYYY`. */
export type MonthOrYearPeriod = Period;

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const YEAR = /^\d{4}$/;

const monthLabel = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "long", year: "numeric" });

export function periodMode(period: Period): PeriodMode {
  if (period === "all") return "all";
  return YEAR.test(period) ? "year" : "month";
}

// Matches MIN_TRANSACTION_DATE: nothing can be recorded earlier, and a shorter year would parse as another mode.
export const MIN_PERIOD_YEAR = 2000;

export function isPeriod(value: string | null): value is Period {
  if (value === null) return false;
  if (value === "all") return true;
  return (YEAR.test(value) || MONTH.test(value)) && Number(value.slice(0, 4)) >= MIN_PERIOD_YEAR;
}

// Same-length strings compare correctly as text, so a month is checked against `latest`'s month and a year against its year.
function notAfter(period: Period, latest: string) {
  return period <= latest.slice(0, period.length);
}

export function isPastOrCurrentPeriod(period: Period, today: string) {
  return isPeriod(period) && period !== "all" && notAfter(period, today);
}

/**
 * `?period=` from a page URL. Anything outside `modes`, before 2000, or after `max`
 * (a `YYYY-MM` or `YYYY-MM-DD`) falls back to the current month.
 */
export function parsePeriod(
  value: string | null,
  { modes, today, max }: { modes: readonly PeriodMode[]; today: string; max?: string },
): Period {
  const valid = isPeriod(value) && modes.includes(periodMode(value)) && (max === undefined || notAfter(value, max));
  return valid ? value : today.slice(0, 7);
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

function step(period: MonthOrYearPeriod, delta: 1 | -1): MonthOrYearPeriod {
  if (YEAR.test(period)) return String(Number(period) + delta);
  const index = Number(period.slice(0, 4)) * 12 + (Number(period.slice(5, 7)) - 1) + delta;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

/**
 * One month or year forward or back, stopping at MIN_PERIOD_YEAR (returns `period` itself).
 * For steppers and anything that must name a period a transaction can be dated in.
 */
export function shiftPeriod(period: Period, delta: 1 | -1): Period {
  if (period === "all") return period;
  const shifted = step(period, delta);
  return Number(shifted.slice(0, 4)) < MIN_PERIOD_YEAR ? period : shifted;
}

/**
 * The period before, with no floor: January 2000 still needs December 1999 to compare
 * against on the dashboard. No transaction can be dated there, so its totals are simply 0.
 */
export function previousPeriod(period: MonthOrYearPeriod): MonthOrYearPeriod {
  return step(period, -1);
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
