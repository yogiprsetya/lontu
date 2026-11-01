"use client";

import Link from "next/link";
import { WalletIcon } from "lucide-react";
import { SectionTitle } from "@/components/layout/section-title";
import { BudgetProgress } from "@/components/budgets/budget-progress";
import { LoadError } from "@/components/settings/load-error";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { useBudgetUsage } from "@/hooks/use-budgets";
import { emptyBudgetMessage, statusLabel, usedPercent } from "@/lib/budget-format";
import { todayInJakarta } from "@/lib/date";
import { dashboardBudget } from "@/lib/dashboard-format";
import { dashboardMode } from "@/lib/dashboard-period";
import type { DashboardPeriod } from "@/lib/schemas/dashboard";
import { cn } from "@/lib/utils";

const LINK_CLASS =
  "inline-flex min-h-11 items-center text-sm font-medium underline-offset-4 hover:underline";

function MonthBudget({ period }: { period: DashboardPeriod }) {
  const money = useAmountFormat();
  const usage = useBudgetUsage(period);
  const budgetHref = `/budget?period=${period}`;

  if (usage.error)
    return <LoadError message="Gagal memuat budget." onRetry={() => void usage.mutate()} />;
  if (!usage.data) return <Skeleton className="h-44 w-full" />;

  const card = dashboardBudget(usage.data);

  if (!card) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">{emptyBudgetMessage(period, todayInJakarta())}</p>
        <Link href={budgetHref} className={cn(buttonVariants(), "h-11 text-base")}>
          Atur budget
        </Link>
      </div>
    );
  }

  const { budget, budgetedSpent, percent, status, highlights } = card;
  const used = usedPercent(budgetedSpent, percent);
  const totalText = statusLabel(status);

  return (
    <>
      <div className="flex flex-col gap-2">
        <p className="truncate font-semibold tabular-nums">
          {money(budgetedSpent)}{" "}
          <span className="font-normal text-muted-foreground">dari {money(budget)}</span>
        </p>
        <BudgetProgress
          percent={used.bar}
          status={status}
          label={`Total budget: ${used.text ?? "0%"} terpakai${totalText ? `, ${totalText}` : ""}`}
        />
      </div>
      {highlights.length === 0 ? (
        <p className="text-sm text-muted-foreground">Semua budget aman.</p>
      ) : (
        <ul className="divide-y" aria-label="Budget yang perlu diperhatikan">
          {highlights.map((item) => (
            <li key={item.budgetId}>
              <Link
                href={budgetHref}
                className="flex min-h-11 items-center justify-between gap-3 py-2"
              >
                <span className="min-w-0 truncate">{item.name}</span>
                <span
                  className={cn(
                    "shrink-0 text-sm tabular-nums",
                    item.status === "over" ? "text-expense" : "text-budget",
                  )}
                >
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
    <section
      aria-labelledby="budget-title"
      className="flex min-w-0 flex-col gap-3 surface px-5 py-5"
    >
      <SectionTitle id="budget-title" icon={WalletIcon} tone="lilac">
        Budget
      </SectionTitle>
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
