// All arithmetic works on YYYY-MM-DD strings so no local timezone can shift a date by a day.

function parts(date: string): [number, number, number] {
  const [y, m, d] = date.split("-").map(Number);
  return [y, m, d];
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** `day` in the given month, capped at that month's last day. */
export function clampDay(year: number, month: number, day: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${pad(month)}-${pad(Math.min(day, lastDay))}`;
}

/** The anchor day in the month after `from`. */
export function advanceDate(dayOfMonth: number, from: string): string {
  const [y, m] = parts(from);
  return m === 12 ? clampDay(y + 1, 1, dayOfMonth) : clampDay(y, m + 1, dayOfMonth);
}

/** This month's anchor if it is today or later, otherwise next month's. */
export function firstDueOnOrAfter(dayOfMonth: number, today: string): string {
  const [y, m] = parts(today);
  const thisMonth = clampDay(y, m, dayOfMonth);
  return thisMonth >= today ? thisMonth : advanceDate(dayOfMonth, today);
}
