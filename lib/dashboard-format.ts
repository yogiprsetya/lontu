import { ACCOUNT_TYPES, type Account, type AccountType } from "@/lib/schemas/account";
import type { BudgetUsageItem } from "@/lib/schemas/budget";
import type { DashboardPeriod, DashboardSummary, DashboardTotals, DateRange } from "@/lib/schemas/dashboard";
import { formatPeriodLabel } from "@/lib/period";

export type ChangeTone = "good" | "bad" | "neutral";

/** Whole percent; null when there is nothing to compare against. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) * 100) / previous);
}

/** The color follows meaning, not direction: more spending is bad. */
export function changeTone(metric: keyof DashboardTotals, delta: number): ChangeTone {
  if (delta === 0) return "neutral";
  const better = metric === "expense" ? delta < 0 : delta > 0;
  return better ? "good" : "bad";
}

/** Current balances of active accounts; a credit card's negative balance lowers the total. */
export function sumBalances(accounts: Account[]) {
  const byType = Object.fromEntries(ACCOUNT_TYPES.map((type) => [type, 0])) as Record<AccountType, number>;
  for (const account of accounts) {
    if (!account.archivedAt) byType[account.type] += account.balance;
  }
  return { total: Object.values(byType).reduce((sum, value) => sum + value, 0), byType };
}

const shortMonth = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "short" });

// Parsed as UTC midnight and formatted in UTC, so the day never shifts with the device zone.
const monthOf = (date: string) => shortMonth.format(new Date(`${date.slice(0, 7)}-01T00:00:00Z`));
const dayOf = (date: string) => String(Number(date.slice(8, 10)));

/** "Sep" for a month, "2025" for a year. */
export function formatShortPeriod(period: DashboardPeriod) {
  return period.length === 4 ? period : monthOf(period);
}

/** "1–25 Sep 2026", or "1 Jan–28 Feb 2027" across months. */
export function formatRangeLabel({ from, to }: DateRange) {
  const year = to.slice(0, 4);
  if (from === to) return `${dayOf(from)} ${monthOf(from)} ${year}`;
  if (from.slice(0, 7) === to.slice(0, 7)) return `${dayOf(from)}–${dayOf(to)} ${monthOf(to)} ${year}`;
  return `${dayOf(from)} ${monthOf(from)}–${dayOf(to)} ${monthOf(to)} ${year}`;
}

/** A `YYYY-MM-DD` day or `YYYY-MM` month bucket, short for the axis or full for text. */
export function formatBucket(bucket: string, style: "tick" | "full") {
  if (bucket.length === 7) return style === "tick" ? monthOf(bucket) : formatPeriodLabel(bucket);
  return style === "tick" ? dayOf(bucket) : formatRangeLabel({ from: bucket, to: bucket });
}

type Bucket = DashboardSummary["activity"][number];

export function activityPeak(activity: Bucket[]): Bucket | null {
  return activity.reduce<Bucket | null>((peak, b) => (b.expense > (peak?.expense ?? 0) ? b : peak), null);
}

/** `categoryId: null` is "Lainnya". */
export type CategorySlice = { categoryId: string | null; amount: number; percent: number };

/**
 * The `n` largest categories plus "Lainnya" for the rest. Lainnya needs two or more
 * leftovers: folding a single category would only hide its name. Amounts add up exactly.
 */
export function topCategories(rows: DashboardSummary["categories"], n = 5): CategorySlice[] {
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const percent = (amount: number) => Math.round((amount * 100) / total);
  const kept = rows.length > n + 1 ? rows.slice(0, n) : rows;
  const slices: CategorySlice[] = kept.map(({ categoryId, amount }) => ({ categoryId, amount, percent: percent(amount) }));
  const rest = rows.slice(kept.length).reduce((sum, row) => sum + row.amount, 0);
  if (rest > 0) slices.push({ categoryId: null, amount: rest, percent: percent(rest) });
  return slices;
}

const fullness = (item: BudgetUsageItem) => item.percent ?? Number.MAX_SAFE_INTEGER;

const ATTENTION: Partial<Record<BudgetUsageItem["status"], number>> = { over: 0, warning: 1 };

/** Budgets that need a look: over first, then nearly used up, fullest first. A zero budget that was spent has no percent and leads. */
export function budgetHighlights(items: BudgetUsageItem[], n = 3) {
  return items
    .filter((item) => ATTENTION[item.status] !== undefined)
    .sort((a, b) => ATTENTION[a.status]! - ATTENTION[b.status]! || fullness(b) - fullness(a))
    .slice(0, n);
}
