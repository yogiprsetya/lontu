import { formatIDR, HIDDEN_AMOUNT } from "@/lib/money";
import { daysBetween } from "@/lib/period";
import type { RecurringType } from "@/lib/schemas/recurring";

export const RECURRING_GROUPS: { type: RecurringType; label: string }[] = [
  { type: "income", label: "Income" },
  { type: "expense", label: "Expense" },
  { type: "saving", label: "Saving" },
];

// Dates are plain YYYY-MM-DD strings; reading them as UTC keeps the calendar day fixed in any local zone.
const dayMonth = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", day: "numeric", month: "short" });
const dayMonthYear = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

export function formatShortDate(date: string, today: string) {
  const formatter = date.slice(0, 4) === today.slice(0, 4) ? dayMonth : dayMonthYear;
  return formatter.format(new Date(`${date}T00:00:00Z`));
}

export function formatSchedule(amount: number, dayOfMonth: number, hideAmounts: boolean) {
  return `${hideAmounts ? HIDDEN_AMOUNT : formatIDR(amount)} · tiap tanggal ${dayOfMonth}`;
}

/** Late is spelled out in the text so it never depends on color alone. */
export function formatDueLabel(nextDueDate: string, today: string) {
  if (nextDueDate === today) return { text: "Hari ini", overdue: false };
  const date = formatShortDate(nextDueDate, today);
  return nextDueDate < today ? { text: `Terlambat · ${date}`, overdue: true } : { text: date, overdue: false };
}

export function formatLateness(dueDate: string, today: string) {
  const late = daysBetween(dueDate, today);
  return late <= 0 ? "hari ini" : `terlambat ${late} hari`;
}

export function formatPaydayHeadline({ payday, daysLeft }: { payday: string; daysLeft: number }, today: string) {
  const date = formatShortDate(payday, today);
  return daysLeft === 1 ? `Besok gajian (${date})` : `${daysLeft} hari lagi gajian (${date})`;
}

/** A shortfall reads "Kurang", so it never depends on color or a minus sign alone. */
export function formatFree(free: number, hideAmounts: boolean) {
  const short = free < 0;
  return { label: short ? "Kurang" : "Bebas", amount: hideAmounts ? HIDDEN_AMOUNT : formatIDR(Math.abs(free)), short };
}
