import { z } from "zod";
import { CATEGORY_KIND_FOR, type CategoryKind } from "@/lib/schemas/category";
import { LIST_TRANSACTION_TYPES, type ListTransactionType } from "@/lib/schemas/transaction";
import type { TransactionType } from "@/lib/transaction-types";

/** `YYYY-MM`, `YYYY` or `all`. Lives only in the page URL; the API takes `from`/`to`. */
export type Period = string;

export type PeriodMode = "month" | "year" | "all";

export type ListFilters = {
  period: Period;
  type?: ListTransactionType;
  accountId?: string;
  categoryId?: string;
};

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;
const YEAR = /^\d{4}$/;

const monthLabel = new Intl.DateTimeFormat("id-ID", { timeZone: "UTC", month: "long", year: "numeric" });

export function periodMode(period: Period): PeriodMode {
  if (period === "all") return "all";
  return YEAR.test(period) ? "year" : "month";
}

function isPeriod(value: string | null): value is Period {
  return value !== null && (value === "all" || YEAR.test(value) || MONTH.test(value));
}

function validUuid(value: string | null) {
  return value !== null && z.uuid().safeParse(value).success ? value : undefined;
}

export function parseFilters(params: Pick<URLSearchParams, "get">, today: string): ListFilters {
  const period = params.get("period");
  const type = params.get("type");
  const filters: ListFilters = { period: isPeriod(period) ? period : today.slice(0, 7) };
  if (type && (LIST_TRANSACTION_TYPES as readonly string[]).includes(type)) filters.type = type as ListTransactionType;
  const accountId = validUuid(params.get("accountId"));
  if (accountId) filters.accountId = accountId;
  const categoryId = validUuid(params.get("categoryId"));
  if (categoryId) filters.categoryId = categoryId;
  return filters;
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

/** Query for the API and the SWR key. Fixed param order so equal filters give equal keys. */
export function filtersToSearchParams({ period, type, accountId, categoryId }: ListFilters) {
  const { from, to } = periodToRange(period);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ type, accountId, categoryId, from, to })) {
    if (value) params.set(key, value);
  }
  return params;
}

/** Query string for the `/transactions` page URL itself. */
export function filtersToUrl({ period, type, accountId, categoryId }: ListFilters) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ period, type, accountId, categoryId })) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

/** Badge number: the period is always set, so it does not count. */
export function countActiveFilters({ type, accountId, categoryId }: ListFilters) {
  return [type, accountId, categoryId].filter(Boolean).length;
}

export function resetFilters({ period }: ListFilters): ListFilters {
  return { period };
}

/**
 * Removes combinations that can never match. `categoryKind` may return undefined for
 * a category it does not know; that one is kept and the server just returns nothing.
 */
export function normalizeFilters(
  input: ListFilters,
  categoryKind: (id: string) => CategoryKind | undefined,
  lockedType?: ListTransactionType,
): ListFilters {
  const filters = lockedType ? { ...input, type: lockedType } : input;
  const { categoryId, type } = filters;
  if (!categoryId || !type) return filters;
  const rest = { ...filters };
  delete rest.categoryId;
  if (type === "transfer" || type === "adjustment") return rest;
  const kind = categoryKind(categoryId);
  return kind && kind !== CATEGORY_KIND_FOR[type as Exclude<TransactionType, "transfer">] ? rest : filters;
}

export function shiftPeriod(period: Period, delta: 1 | -1): Period {
  if (period === "all") return period;
  if (YEAR.test(period)) return String(Number(period) + delta);
  const [, year, month] = MONTH.exec(period) ?? [];
  const index = Number(year) * 12 + (Number(month) - 1) + delta;
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

/** `<period>` in the download name; a range that is not a whole month or year is spelled out. */
export function exportFilename({ from, to }: { from?: string; to?: string }) {
  if (!from && !to) return "lontu-transaksi-semua.csv";
  const month = from?.slice(0, 7);
  if (from && to && month && periodToRange(month).from === from && periodToRange(month).to === to) {
    return `lontu-transaksi-${month}.csv`;
  }
  const year = from?.slice(0, 4);
  if (from && to && year && periodToRange(year).from === from && periodToRange(year).to === to) {
    return `lontu-transaksi-${year}.csv`;
  }
  return `lontu-transaksi-${from ?? ""}_${to ?? ""}.csv`;
}
