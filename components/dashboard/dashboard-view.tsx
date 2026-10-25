"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BalanceCard } from "@/components/dashboard/balance-card";
import { DashboardBudgetSummary } from "@/components/dashboard/budget-summary";
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

  // DOM order is the mobile reading order; on lg the grid moves charts left and balance + budget right.
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
      <div className="lg:col-span-2">
        <PeriodStepper period={period} onChange={setPeriod} modes={["month", "year"]} />
      </div>
      <div className="min-w-0 lg:col-start-2 lg:row-start-3">
        <BalanceCard period={period} />
      </div>
      <div className="min-w-0 lg:col-span-2 lg:row-start-2">
        <SummaryCards period={period} />
      </div>
      <div className="min-w-0 lg:col-start-2 lg:row-start-4">
        <DashboardBudgetSummary period={period} />
      </div>
      <div className="min-w-0 lg:col-start-1 lg:row-start-3">
        <ExpenseActivity period={period} />
      </div>
      <div className="min-w-0 lg:col-start-1 lg:row-start-4">
        <CategoryBreakdown period={period} />
      </div>
    </div>
  );
}
