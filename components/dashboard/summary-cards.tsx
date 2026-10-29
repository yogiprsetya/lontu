"use client";

import Link from "next/link";
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon, ScaleIcon, type LucideIcon } from "lucide-react";
import { LoadError } from "@/components/settings/load-error";
import { TYPE_STYLES } from "@/components/transactions/type-styles";
import { Skeleton } from "@/components/ui/skeleton";
import { useAmountFormat, useAmountsHidden } from "@/hooks/use-amount-format";
import { useDashboard } from "@/hooks/use-dashboard";
import { changeTone, formatRangeLabel, formatShortPeriod, percentChange, type ChangeTone } from "@/lib/dashboard-format";
import { formatIDR } from "@/lib/money";
import type { DashboardPeriod, DashboardSummary, DashboardTotals } from "@/lib/schemas/dashboard";
import { filtersToUrl } from "@/lib/transaction-filters";
import { cn } from "@/lib/utils";

const CARDS = [
  { key: "income", label: "Income", ...TYPE_STYLES.income },
  { key: "expense", label: "Expense", ...TYPE_STYLES.expense },
  { key: "saving", label: "Saving", ...TYPE_STYLES.saving },
  { key: "net", label: "Sisa", icon: ScaleIcon, tile: "surface" },
] as const satisfies { key: keyof DashboardTotals; label: string; icon: LucideIcon; tile: string }[];

const TONE_CLASS: Record<ChangeTone, string> = {
  good: "text-income",
  bad: "text-expense",
  neutral: "text-muted-foreground",
};

const CARD_CLASS = "flex min-h-36 min-w-0 flex-col gap-1 rounded-2xl px-3.5 py-4 shadow-soft sm:px-4";

function ChangeLine({ tone, icon: Icon, text }: { tone: ChangeTone; icon: LucideIcon; text: string }) {
  return (
    <p className={cn("flex items-start gap-1 text-sm font-semibold", TONE_CLASS[tone])}>
      <Icon aria-hidden className="mt-0.5 size-4 shrink-0" />
      <span className="min-w-0">{text}</span>
    </p>
  );
}

function Change({ metric, summary }: { metric: keyof DashboardTotals; summary: DashboardSummary }) {
  const money = useAmountFormat();
  const current = summary.totals[metric];
  const previous = summary.previousTotals[metric];
  const delta = current - previous;
  const against = formatShortPeriod(summary.previous.period);
  const percent = percentChange(current, previous);

  if (metric !== "net" && percent === null) return <ChangeLine tone="neutral" icon={MinusIcon} text="—" />;
  if (delta === 0) return <ChangeLine tone="neutral" icon={MinusIcon} text={`sama dengan ${against}`} />;

  // Sisa can change sign, so a percentage would mislead; it shows the difference in rupiah.
  const size = metric === "net" ? money(Math.abs(delta)) : `${Math.abs(percent ?? 0)}%`;
  return (
    <ChangeLine
      tone={changeTone(metric, delta)}
      icon={delta > 0 ? ArrowUpRightIcon : ArrowDownRightIcon}
      text={`${delta > 0 ? "naik" : "turun"} ${size} dari ${against}`}
    />
  );
}

export function SummaryCards({ period }: { period: DashboardPeriod }) {
  const money = useAmountFormat();
  const hidden = useAmountsHidden();
  const { data, error, mutate } = useDashboard(period);

  if (error) return <LoadError message="Gagal memuat ringkasan." onRetry={() => void mutate()} />;

  return (
    <section aria-labelledby="summary-title" className="flex flex-col gap-2">
      <h2 id="summary-title" className="sr-only">
        Ringkasan periode
      </h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-busy={!data}>
        {CARDS.map(({ key, label, icon: Icon, tile }) => {
          if (!data) {
            return (
              <li key={key}>
                <Skeleton className="h-36 w-full rounded-2xl" />
              </li>
            );
          }
          const amount = data.totals[key];
          const body = (
            <>
              <span className="flex items-center gap-1.5 text-sm font-bold">
                <Icon aria-hidden className="size-4" />
                {label}
              </span>
              <span
                className={cn("truncate font-heading text-lg font-extrabold tabular-nums text-foreground sm:text-2xl", key === "net" && !hidden && amount < 0 && "text-expense")}
                title={hidden ? undefined : formatIDR(amount)}
              >
                {money(amount)}
              </span>
              <Change metric={key} summary={data} />
            </>
          );
          return (
            <li key={key} className="min-w-0">
              {key === "net" ? (
                <div className={cn(CARD_CLASS, tile)}>{body}</div>
              ) : (
                <Link
                  href={`/transactions?${filtersToUrl({ period, type: key })}`}
                  className={cn(CARD_CLASS, tile, "transition-[filter,transform] hover:brightness-[0.97] motion-safe:active:scale-[0.98] dark:hover:brightness-110")}
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
      {data ? (
        <p className="h-5 text-sm font-semibold text-muted-foreground">Dibanding {formatRangeLabel(data.previous.range)}</p>
      ) : (
        <Skeleton className="h-5 w-40" />
      )}
    </section>
  );
}
