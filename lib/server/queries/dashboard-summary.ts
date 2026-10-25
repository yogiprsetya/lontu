import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { dashboardMode, dashboardRanges } from "@/lib/dashboard-period";
import type { DashboardMode, DashboardPeriod, DashboardSummary, DashboardTotals, DateRange } from "@/lib/schemas/dashboard";
import { transactionTotals } from "@/lib/server/queries/transaction-totals";

const BUCKET = {
  month: { step: sql.raw("interval '1 day'"), label: "YYYY-MM-DD" },
  year: { step: sql.raw("interval '1 month'"), label: "YYYY-MM" },
};

/**
 * Expense per day or month, every bucket present. The series runs over `timestamp` (not
 * `timestamptz`) and labels come from `to_char`, so no time zone can shift a day.
 */
async function expenseActivity(userId: string, { from, to }: DateRange, mode: DashboardMode) {
  const { step, label } = BUCKET[mode];
  const rows = await db.execute<{ bucket: string; expense: string }>(sql`
    select to_char(b.start, ${label}) as bucket, coalesce(sum(t.amount), 0)::bigint as expense
    from generate_series(${from}::timestamp, ${to}::timestamp, ${step}) as b(start)
    left join transactions t
      on t.user_id = ${userId}
      and t.type = 'expense'
      and t.deleted_at is null
      and t.date >= b.start::date
      and t.date < (b.start + ${step})::date
      and t.date <= ${to}::date
    group by b.start
    order by b.start
  `);
  return rows.map((row) => ({ bucket: row.bucket, expense: Number(row.expense) }));
}

async function totalsWithNet(userId: string, range: DateRange): Promise<DashboardTotals> {
  const totals = await transactionTotals(userId, range);
  return { ...totals, net: totals.income - totals.expense - totals.saving };
}

/** `today` is a parameter so tests can pin it; the route passes `todayInJakarta()`. */
export async function dashboardSummary(userId: string, period: DashboardPeriod, today: string): Promise<DashboardSummary> {
  const { range, previous } = dashboardRanges(period, today);
  const [totals, previousTotals, activity] = await Promise.all([
    totalsWithNet(userId, range),
    totalsWithNet(userId, previous.range),
    expenseActivity(userId, range, dashboardMode(period)),
  ]);
  return { period, range, previous, totals, previousTotals, activity };
}
