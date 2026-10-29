"use client";

import { LoadError } from "@/components/settings/load-error";
import { TYPE_STYLES } from "@/components/transactions/type-styles";
import { Skeleton } from "@/components/ui/skeleton";
import { useAmountFormat, useAmountsHidden } from "@/hooks/use-amount-format";
import { useTransactionTotals } from "@/hooks/use-transactions";
import { abbreviateIDR, formatIDR } from "@/lib/money";
import type { ListFilters } from "@/lib/transaction-filters";

const ITEMS = [
  { key: "income", label: "Income" },
  { key: "expense", label: "Expense" },
  { key: "saving", label: "Saving" },
] as const;

// Full rupiah in the display font does not fit three-up at 360 px once it reaches seven digits.
const compactIDR = (amount: number) => (amount >= 1e6 ? `Rp${abbreviateIDR(amount)}` : formatIDR(amount));

export function TotalsStrip({ filters }: { filters: ListFilters }) {
  const money = useAmountFormat();
  const hidden = useAmountsHidden();
  const { data, error, mutate } = useTransactionTotals(filters);

  if (error) return <LoadError message="Gagal memuat total." onRetry={() => void mutate()} />;

  return (
    <dl className="grid grid-cols-3 gap-2" aria-busy={!data}>
      {ITEMS.map(({ key, label }) => (
        <div key={key} className={`min-w-0 rounded-2xl px-3 py-3 shadow-soft ${TYPE_STYLES[key].tile}`}>
          <dt className="text-sm font-bold">{label}</dt>
          <dd className="truncate font-heading text-lg font-extrabold tabular-nums text-foreground">
            {!data ? (
              <Skeleton className="h-6 w-full" />
            ) : (
              <span title={hidden ? undefined : formatIDR(data[key])}>{money(data[key], compactIDR)}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
