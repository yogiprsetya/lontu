"use client";

import Link from "next/link";
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import { LoadError } from "@/components/settings/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/use-dashboard";
import { changeTone, formatRangeLabel, formatShortPeriod, percentChange, type ChangeTone } from "@/lib/dashboard-format";
import { formatIDR, HIDDEN_AMOUNT } from "@/lib/money";
import type { DashboardPeriod, DashboardSummary, DashboardTotals } from "@/lib/schemas/dashboard";
import { filtersToUrl } from "@/lib/transaction-filters";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";

const CARDS = [
  { key: "income", label: "Income", amountTone: "text-income" },
  { key: "expense", label: "Expense", amountTone: "text-expense" },
  { key: "saving", label: "Saving", amountTone: "text-budget" },
  { key: "net", label: "Sisa", amountTone: "" },
] as const satisfies { key: keyof DashboardTotals; label: string; amountTone: string }[];

const TONE_CLASS: Record<ChangeTone, string> = {
  good: "text-income",
  bad: "text-expense",
  neutral: "text-muted-foreground",
};

const CARD_CLASS = "flex min-h-32 min-w-0 flex-col gap-1 rounded-lg border px-3 py-3";

function Change({ metric, summary, hideAmounts }: { metric: keyof DashboardTotals; summary: DashboardSummary; hideAmounts: boolean }) {
  const current = summary.totals[metric];
  const previous = summary.previousTotals[metric];
  const delta = current - previous;
  const against = formatShortPeriod(summary.previous.period);
  // Sisa can change sign, so a percentage would mislead; it shows the difference in rupiah.
  const percent = metric === "net" ? null : percentChange(current, previous);

  const noBase = metric !== "net" && percent === null;
  let text = "—";
  if (!noBase && delta === 0) text = `sama dengan ${against}`;
  else if (!noBase) {
    const size = metric === "net" ? (hideAmounts ? HIDDEN_AMOUNT : formatIDR(Math.abs(delta))) : `${Math.abs(percent!)}%`;
    text = `${delta > 0 ? "naik" : "turun"} ${size} dari ${against}`;
  }

  const Icon = noBase || delta === 0 ? MinusIcon : delta > 0 ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <p className={cn("flex items-start gap-1 text-sm", TONE_CLASS[noBase ? "neutral" : changeTone(metric, delta)])}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{text}</span>
    </p>
  );
}

export function SummaryCards({ period }: { period: DashboardPeriod }) {
  const hideAmounts = useUIStore((s) => s.hideAmounts);
  const { data, error, mutate } = useDashboard(period);

  if (error) return <LoadError message="Gagal memuat ringkasan." onRetry={() => void mutate()} />;

  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-2">
      <h2 id="summary-title" className="sr-only">
        Ringkasan periode
      </h2>
      <ul className="grid grid-cols-2 gap-2 lg:grid-cols-4" aria-busy={!data}>
        {CARDS.map(({ key, label, amountTone }) => {
          if (!data) {
            return (
              <li key={key}>
                <Skeleton className="h-32 w-full rounded-lg" />
              </li>
            );
          }
          const amount = data.totals[key];
          const body = (
            <>
              <span className="text-sm text-muted-foreground">{label}</span>
              <span
                className={cn("truncate text-base font-semibold tabular-nums sm:text-lg", amountTone, key === "net" && !hideAmounts && amount < 0 && "text-expense")}
                title={hideAmounts ? undefined : formatIDR(amount)}
              >
                {hideAmounts ? HIDDEN_AMOUNT : formatIDR(amount)}
              </span>
              <Change metric={key} summary={data} hideAmounts={hideAmounts} />
            </>
          );
          return (
            <li key={key} className="min-w-0">
              {key === "net" ? (
                <div className={CARD_CLASS}>{body}</div>
              ) : (
                <Link
                  href={`/transactions?${filtersToUrl({ period, type: key })}`}
                  className={cn(CARD_CLASS, "transition-colors hover:bg-muted/50")}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {data ? (
        <p className="h-5 text-sm text-muted-foreground">Dibanding {formatRangeLabel(data.previous.range)}</p>
      ) : (
        <Skeleton className="h-5 w-40" />
      )}
    </section>
  );
}
