"use client";

import { LoadError } from "@/components/settings/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactionTotals } from "@/hooks/use-transactions";
import { abbreviateIDR, formatIDR } from "@/lib/money";
import type { ListFilters } from "@/lib/transaction-filters";
import { useUIStore } from "@/stores/ui";

const ITEMS = [
  { key: "income", label: "Income", tone: "text-income" },
  { key: "expense", label: "Expense", tone: "text-expense" },
  { key: "saving", label: "Saving", tone: "text-budget" },
] as const;

export function TotalsStrip({ filters }: { filters: ListFilters }) {
  const hideAmounts = useUIStore((s) => s.hideAmounts);
  const { data, error, mutate } = useTransactionTotals(filters);

  if (error) return <LoadError message="Gagal memuat total." onRetry={() => void mutate()} />;

  return (
    <dl className="grid grid-cols-3 gap-2" aria-busy={!data}>
      {ITEMS.map(({ key, label, tone }) => (
        <div key={key} className="min-w-0 rounded-lg border px-3 py-2">
          <dt className="text-sm text-muted-foreground">{label}</dt>
          <dd className={`truncate font-semibold tabular-nums ${tone}`}>
            {!data ? (
              <Skeleton className="h-6 w-full" />
            ) : hideAmounts ? (
              "Rp•••••"
            ) : (
              // Full rupiah does not fit three-up at 360 px once it passes seven digits.
              <span title={formatIDR(data[key])}>{data[key] >= 1e7 ? `Rp${abbreviateIDR(data[key])}` : formatIDR(data[key])}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
