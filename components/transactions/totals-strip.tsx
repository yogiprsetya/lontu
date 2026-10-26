"use client";

import { LoadError } from "@/components/settings/load-error";
import { TYPE_STYLES } from "@/components/transactions/type-chip";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactionTotals } from "@/hooks/use-transactions";
import { abbreviateIDR, formatIDR, HIDDEN_AMOUNT } from "@/lib/money";
import type { ListFilters } from "@/lib/transaction-filters";
import { useUIStore } from "@/stores/ui";

const ITEMS = [
  { key: "income", label: "Income" },
  { key: "expense", label: "Expense" },
  { key: "saving", label: "Saving" },
] as const;

export function TotalsStrip({ filters }: { filters: ListFilters }) {
  const hideAmounts = useUIStore((s) => s.hideAmounts);
  const { data, error, mutate } = useTransactionTotals(filters);

  if (error) return <LoadError message="Gagal memuat total." onRetry={() => void mutate()} />;

  return (
    <dl className="grid grid-cols-3 gap-2" aria-busy={!data}>
      {ITEMS.map(({ key, label }) => (
        <div key={key} className={`min-w-0 rounded-2xl px-3 py-3 ${TYPE_STYLES[key].tile}`}>
          <dt className="text-sm font-bold">{label}</dt>
          <dd className="truncate font-heading text-lg font-extrabold tabular-nums text-foreground">
            {!data ? (
              <Skeleton className="h-6 w-full" />
            ) : hideAmounts ? (
              HIDDEN_AMOUNT
            ) : (
              // Full rupiah in the display font does not fit three-up at 360 px once it reaches seven digits.
              <span title={formatIDR(data[key])}>{data[key] >= 1e6 ? `Rp${abbreviateIDR(data[key])}` : formatIDR(data[key])}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
