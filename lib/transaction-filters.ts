import { z } from "zod";
import { parsePeriod, periodToRange, type Period } from "@/lib/period";
import { CATEGORY_KIND_FOR, type CategoryKind } from "@/lib/schemas/category";
import { LIST_TRANSACTION_TYPES, type ListTransactionType } from "@/lib/schemas/transaction";

export type ListFilters = {
  period: Period;
  type?: ListTransactionType;
  accountId?: string;
  categoryId?: string;
};

function validUuid(value: string | null) {
  return value !== null && z.uuid().safeParse(value).success ? value : undefined;
}

export function parseFilters(params: Pick<URLSearchParams, "get">, today: string): ListFilters {
  const type = params.get("type");
  const filters: ListFilters = { period: parsePeriod(params.get("period"), { modes: ["month", "year", "all"], today }) };
  if (type && (LIST_TRANSACTION_TYPES as readonly string[]).includes(type)) filters.type = type as ListTransactionType;
  const accountId = validUuid(params.get("accountId"));
  if (accountId) filters.accountId = accountId;
  const categoryId = validUuid(params.get("categoryId"));
  if (categoryId) filters.categoryId = categoryId;
  return filters;
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
  return kind && kind !== CATEGORY_KIND_FOR[type] ? rest : filters;
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

export function exportHref(filters: ListFilters) {
  const query = filtersToSearchParams(filters).toString();
  return query ? `/api/transactions/export?${query}` : "/api/transactions/export";
}
