"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { CategoryBreakdown } from "@/components/dashboard/category-breakdown";
import { ExpenseActivity } from "@/components/dashboard/expense-activity";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { PeriodStepper } from "@/components/transactions/period-stepper";
import { dashboardPeriodFromParam } from "@/lib/dashboard-period";
import { todayInJakarta } from "@/lib/date";
import type { DashboardPeriod } from "@/lib/schemas/dashboard";

/** The period lives in the URL so a refresh or a shared link shows the same dashboard. */
export function DashboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = dashboardPeriodFromParam(searchParams.get("period"), todayInJakarta());

  // replace, not push: stepping through months must not fill the back stack.
  function setPeriod(next: DashboardPeriod) {
    router.replace(`${pathname}?period=${next}`, { scroll: false });
  }

  return (
    <>
      <PeriodStepper period={period} onChange={setPeriod} modes={["month", "year"]} />
      <BalanceCard period={period} />
      <SummaryCards period={period} />
      <ExpenseActivity period={period} />
      <CategoryBreakdown period={period} />
    </>
  );
}
