"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { FilterPanel } from "@/components/transactions/filter-panel";
import { PeriodStepper } from "@/components/transactions/period-stepper";
import { TotalsStrip } from "@/components/transactions/totals-strip";
import { TransactionList } from "@/components/transactions/transaction-list";
import { todayInJakarta } from "@/lib/date";
import type { ListTransactionType } from "@/lib/schemas/transaction";
import { filtersToUrl, parseFilters, type ListFilters } from "@/lib/transaction-filters";

/** Filters live in the URL so a refresh, back and a pasted link all show the same list. */
export function TransactionsView({ lockedType }: { lockedType?: ListTransactionType }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const filters = useMemo(() => {
    const parsed = parseFilters(new URLSearchParams(query), todayInJakarta());
    // A locked page ignores any `type` in the URL.
    return lockedType ? { ...parsed, type: lockedType } : parsed;
  }, [query, lockedType]);

  // replace, not push: stepping through months must not fill the back stack.
  function setFilters(next: ListFilters) {
    const url = filtersToUrl(lockedType ? { ...next, type: undefined } : next);
    router.replace(`${pathname}?${url}`, { scroll: false });
  }

  return (
    <>
      <PeriodStepper period={filters.period} onChange={(period) => setFilters({ ...filters, period })} />
      <FilterPanel filters={filters} onChange={setFilters} lockedType={lockedType} />
      <TotalsStrip filters={filters} />
      <TransactionList filters={filters} />
    </>
  );
}
