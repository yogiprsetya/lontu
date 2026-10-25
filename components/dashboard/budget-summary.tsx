"use client";

import { useMemo } from "react";
import Link from "next/link";
import { BudgetProgress } from "@/components/budgets/budget-progress";
import { LoadError } from "@/components/settings/load-error";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudgets } from "@/hooks/use-budgets";
import { useCategories } from "@/hooks/use-categories";
import { archiveLabel } from "@/lib/archived";
import { budgetTransactionsHref, formatBudgetAmount, groupStatus, statusLabel } from "@/lib/budget-format";
import { budgetHighlights } from "@/lib/dashboard-format";
import { dashboardMode } from "@/lib/dashboard-period";
import type { DashboardPeriod } from "@/lib/schemas/dashboard";
import { formatPeriodLabel } from "@/lib/transaction-filters";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";

const LINK_CLASS = "inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline";

function MonthBudget({ period }: { period: DashboardPeriod }) {
  const hideAmounts = useUIStore((s) => s.hideAmounts);
  const usage = useBudgets(period);
  const categories = useCategories({ includeArchived: true });
  const names = useMemo(() => new Map(categories.data?.map((c) => [c.id, archiveLabel(c)])), [categories.data]);
  const money = (amount: number) => formatBudgetAmount(amount, hideAmounts);
  const budgetHref = `/budget?period=${period}`;

  if (usage.error) return <LoadError message="Gagal memuat budget." onRetry={() => void usage.mutate()} />;
  if (!usage.data) return <Skeleton className="h-44 w-full" />;

  const total = usage.data.summary.total;
  const { budgetedSpent, percent, status } = groupStatus(total);
  if (total.budget === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">Belum ada budget untuk {formatPeriodLabel(period)}.</p>
        <Link href={budgetHref} className={cn(buttonVariants(), "h-11 text-base")}>
          Atur budget
        </Link>
      </div>
    );
  }

  const highlights = budgetHighlights(usage.data.items);
  const totalText = statusLabel(status);
  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="truncate font-semibold tabular-nums">
          {money(budgetedSpent)} <span className="font-normal text-muted-foreground">dari {money(total.budget)}</span>
        </p>
        <BudgetProgress
          percent={percent}
          status={status}
          label={`Total budget: ${percent ?? 0}% terpakai${totalText ? `, ${totalText}` : ""}`}
        />
      </div>
      {highlights.length === 0 ? (
        <p className="text-sm text-muted-foreground">Semua budget aman.</p>
      ) : (
        <ul className="divide-y" aria-label="Budget yang perlu diperhatikan">
          {highlights.map((item) => (
            <li key={item.categoryId}>
              <Link href={budgetTransactionsHref(period, item.categoryId)} className="flex min-h-11 items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">{names.get(item.categoryId) ?? "Kategori"}</span>
                <span className={cn("shrink-0 text-sm tabular-nums", item.status === "over" ? "text-expense" : "text-budget")}>
                  {item.percent !== null && `${item.percent}% · `}
                  {statusLabel(item.status)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={budgetHref} className={LINK_CLASS}>
        Lihat budget
      </Link>
    </>
  );
}

export function DashboardBudgetSummary({ period }: { period: DashboardPeriod }) {
  return (
    <section aria-labelledby="budget-title" className="flex min-w-0 flex-col gap-3 rounded-lg border px-4 py-4">
      <h2 id="budget-title" className="font-semibold">
        Budget
      </h2>
      {dashboardMode(period) === "month" ? (
        <MonthBudget period={period} />
      ) : (
        <div className="flex flex-col items-start gap-1">
          <p className="text-sm text-muted-foreground">Budget dihitung per bulan.</p>
          <Link href="/budget" className={LINK_CLASS}>
            Lihat budget
          </Link>
        </div>
      )}
    </section>
  );
}
