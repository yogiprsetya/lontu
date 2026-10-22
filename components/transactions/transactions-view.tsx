"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PeriodStepper } from "@/components/transactions/period-stepper";
import { TotalsStrip } from "@/components/transactions/totals-strip";
import { TransactionList } from "@/components/transactions/transaction-list";
import { todayInJakarta } from "@/lib/date";
import { filtersToUrl, parseFilters, type ListFilters } from "@/lib/transaction-filters";

/** Filters live in the URL so a refresh, back and a pasted link all show the same list. */
export function TransactionsView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const filters = useMemo(() => parseFilters(new URLSearchParams(query), todayInJakarta()), [query]);

  // replace, not push: stepping through months must not fill the back stack.
  function setFilters(next: ListFilters) {
    router.replace(`${pathname}?${filtersToUrl(next)}`, { scroll: false });
  }

  return (
    <>
      <PeriodStepper period={filters.period} onChange={(period) => setFilters({ ...filters, period })} />
      <TotalsStrip filters={filters} />
      <TransactionList filters={filters} />
    </>
  );
}
