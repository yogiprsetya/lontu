"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ChartPieIcon } from "lucide-react";
import { SectionTitle } from "@/components/layout/section-title";
import { NoExpense } from "@/components/dashboard/expense-activity";
import { LoadError } from "@/components/settings/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { useCategories } from "@/hooks/use-categories";
import { useDashboard } from "@/hooks/use-dashboard";
import { archiveLabel } from "@/lib/archived";
import { topCategories } from "@/lib/dashboard-format";
import type { DashboardPeriod } from "@/lib/schemas/dashboard";
import { filtersToUrl } from "@/lib/transaction-filters";

const donutSkeleton = () => <Skeleton className="mx-auto size-48 rounded-full" />;

const CategoryDonutChart = dynamic(() => import("@/components/dashboard/category-donut-chart"), {
  ssr: false,
  loading: donutSkeleton,
});

const CHART_COLORS = 5;
const OTHERS_COLOR = "var(--muted-foreground)";
// With exactly six categories there is no "Lainnya", and the sixth takes its grey; the legend still names it.
const sliceColor = (index: number) => (index < CHART_COLORS ? `var(--chart-${index + 1})` : OTHERS_COLOR);

const ROW_CLASS = "flex min-h-11 items-center gap-3 py-2";

export function CategoryBreakdown({ period }: { period: DashboardPeriod }) {
  const money = useAmountFormat();
  const { data, error, mutate } = useDashboard(period);
  const categories = useCategories({ includeArchived: true });
  const names = useMemo(() => new Map(categories.data?.map((c) => [c.id, archiveLabel(c)])), [categories.data]);

  let content;
  if (error) {
    content = <LoadError message="Gagal memuat pengeluaran per kategori." onRetry={() => void mutate()} />;
  } else if (!data) {
    content = (
      <>
        {donutSkeleton()}
        <Skeleton className="h-44 w-full" />
      </>
    );
  } else if (data.categories.length === 0) {
    content = <NoExpense period={period} />;
  } else {
    const slices = topCategories(data.categories).map((slice, i) => ({
      ...slice,
      key: slice.categoryId ?? "others",
      name: slice.categoryId ? (names.get(slice.categoryId) ?? "Kategori") : "Lainnya",
      color: sliceColor(i),
    }));
    content = (
      <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[12rem_1fr] sm:items-center">
        <CategoryDonutChart slices={slices} centerLabel={money(data.totals.expense)} />
        <ul className="min-w-0 divide-y" aria-label={`Pengeluaran per kategori, total ${money(data.totals.expense)}`}>
          {slices.map((slice) => {
            const row = (
              <>
                <span aria-hidden className="size-3 shrink-0 rounded-full" style={{ background: slice.color }} />
                <span className="min-w-0 flex-1 truncate">{slice.name}</span>
                <span className="shrink-0 text-sm tabular-nums">{money(slice.amount)}</span>
                <span className="w-10 shrink-0 text-right text-sm text-muted-foreground tabular-nums">{slice.percent}%</span>
              </>
            );
            return (
              <li key={slice.key}>
                {slice.categoryId ? (
                  <Link
                    href={`/transactions?${filtersToUrl({ period, type: "expense", categoryId: slice.categoryId })}`}
                    className={ROW_CLASS}
                  >
                    {row}
                  </Link>
                ) : (
                  <div className={ROW_CLASS}>{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <section aria-labelledby="categories-title" className="flex min-w-0 flex-col gap-3 surface px-5 py-5">
      <SectionTitle id="categories-title" icon={ChartPieIcon} tone="mint">
        Pengeluaran per kategori
      </SectionTitle>
      {content}
    </section>
  );
}
