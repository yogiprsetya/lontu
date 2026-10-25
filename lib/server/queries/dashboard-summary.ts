import "server-only";
import { dashboardRanges } from "@/lib/dashboard-period";
import type { DashboardPeriod, DashboardSummary, DashboardTotals, DateRange } from "@/lib/schemas/dashboard";
import { transactionTotals } from "@/lib/server/queries/transaction-totals";

async function totalsWithNet(userId: string, range: DateRange): Promise<DashboardTotals> {
  const totals = await transactionTotals(userId, range);
  return { ...totals, net: totals.income - totals.expense - totals.saving };
}

/** `today` is a parameter so tests can pin it; the route passes `todayInJakarta()`. */
export async function dashboardSummary(userId: string, period: DashboardPeriod, today: string): Promise<DashboardSummary> {
  const { range, previous } = dashboardRanges(period, today);
  const [totals, previousTotals] = await Promise.all([
    totalsWithNet(userId, range),
    totalsWithNet(userId, previous.range),
  ]);
  return { period, range, previous, totals, previousTotals };
}
