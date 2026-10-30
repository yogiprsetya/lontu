"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ChartColumnIcon } from "lucide-react";
import { SectionTitle } from "@/components/layout/section-title";
import { LoadError } from "@/components/settings/load-error";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { useDashboard } from "@/hooks/use-dashboard";
import { dashboardMode } from "@/lib/dashboard-period";
import { activityPeak, formatBucket } from "@/lib/dashboard-format";
import type { DashboardPeriod } from "@/lib/schemas/dashboard";
import { formatPeriodLabel } from "@/lib/period";
import { cn } from "@/lib/utils";

// Same height as the chart so nothing shifts when Recharts arrives.
const chartSkeleton = () => <Skeleton className="h-56 w-full" />;

const ExpenseActivityChart = dynamic(
  () => import("@/components/dashboard/expense-activity-chart"),
  {
    ssr: false,
    loading: chartSkeleton,
  },
);

export function NoExpense({ period }: { period: DashboardPeriod }) {
  return (
    <div className="flex h-56 flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed px-6 text-center">
      <p className="text-muted-foreground">Belum ada pengeluaran di {formatPeriodLabel(period)}.</p>
      <Link href="/add/expense" className={cn(buttonVariants(), "h-11 text-base")}>
        Catat expense
      </Link>
    </div>
  );
}

export function ExpenseActivity({ period }: { period: DashboardPeriod }) {
  const money = useAmountFormat();
  const { data, error, mutate } = useDashboard(period);
  const unit = dashboardMode(period) === "year" ? "Bulan" : "Tanggal";

  let content;
  if (error) {
    content = <LoadError message="Gagal memuat aktivitas." onRetry={() => void mutate()} />;
  } else if (!data) {
    content = (
      <>
        <Skeleton className="h-5 w-3/4" />
        {chartSkeleton()}
      </>
    );
  } else {
    const peak = activityPeak(data.activity);
    content = !peak ? (
      <NoExpense period={period} />
    ) : (
      <>
        <p className="h-5 truncate text-sm text-muted-foreground">
          Total {money(data.totals.expense)}, tertinggi {money(peak.expense)} pada{" "}
          {formatBucket(peak.bucket, "full")}
        </p>
        <ExpenseActivityChart activity={data.activity} />
        <table className="sr-only">
          <caption>Expense per {unit.toLowerCase()}</caption>
          <thead>
            <tr>
              <th scope="col">{unit}</th>
              <th scope="col">Expense</th>
            </tr>
          </thead>
          <tbody>
            {data.activity.map((b) => (
              <tr key={b.bucket}>
                <th scope="row">{formatBucket(b.bucket, "full")}</th>
                <td>{money(b.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    );
  }

  return (
    <section
      aria-labelledby="activity-title"
      className="flex min-w-0 flex-col gap-3 surface px-5 py-5"
    >
      <SectionTitle id="activity-title" icon={ChartColumnIcon} tone="peach">
        Expense Activity
      </SectionTitle>
      {content}
    </section>
  );
}
