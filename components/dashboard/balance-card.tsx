"use client";

import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { sumBalances } from "@/lib/dashboard-format";
import { formatIDR, HIDDEN_AMOUNT } from "@/lib/money";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES } from "@/lib/schemas/account";
import type { DashboardPeriod } from "@/lib/schemas/dashboard";
import { filtersToUrl } from "@/lib/transaction-filters";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";

/** Balances are always today's, whatever the period; the period only scopes the drill-down. */
export function BalanceCard({ period }: { period: DashboardPeriod }) {
  const hideAmounts = useUIStore((s) => s.hideAmounts);
  const openModal = useUIStore((s) => s.open);
  const { data, error, mutate } = useAccounts();
  const money = (amount: number) => (hideAmounts ? HIDDEN_AMOUNT : formatIDR(amount));
  const tone = (amount: number) => !hideAmounts && amount < 0 && "text-expense";

  if (error) return <LoadError message="Gagal memuat saldo." onRetry={() => void mutate()} />;
  if (!data) return <Skeleton className="h-48 w-full rounded-lg" aria-busy="true" />;

  if (data.length === 0) {
    return (
      <section aria-labelledby="balance-title" className="flex flex-col items-start gap-3 rounded-lg border px-4 py-4">
        <h2 id="balance-title" className="text-sm text-muted-foreground">
          Total saldo
        </h2>
        <p className="text-muted-foreground">Belum ada akun. Tambahkan akun untuk melihat saldo.</p>
        <Button className="h-11 text-base" onClick={() => openModal("manageAccounts")}>
          Tambah akun
        </Button>
      </section>
    );
  }

  const { total, byType } = sumBalances(data);

  return (
    <section aria-labelledby="balance-title" className="flex flex-col gap-3 rounded-lg border px-4 py-4">
      <div className="min-w-0">
        <h2 id="balance-title" className="text-sm text-muted-foreground">
          Total saldo
        </h2>
        <p className={cn("truncate text-2xl font-semibold tabular-nums", tone(total))}>{money(total)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        {ACCOUNT_TYPES.map((type) => (
          <div key={type} className="min-w-0">
            <dt className="text-sm text-muted-foreground">{ACCOUNT_TYPE_LABELS[type]}</dt>
            <dd className={cn("truncate font-medium tabular-nums", tone(byType[type]))}>{money(byType[type])}</dd>
          </div>
        ))}
      </dl>
      <details className="group -mx-4 border-t">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-4 pt-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
          Saldo per akun
          <ChevronDownIcon aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="divide-y px-4">
          {data.map((account) => (
            <li key={account.id}>
              <Link
                href={`/transactions?${filtersToUrl({ period, accountId: account.id })}`}
                className="flex min-h-11 items-center justify-between gap-3 py-2"
              >
                <span className="min-w-0 truncate">{account.name}</span>
                <span className={cn("shrink-0 tabular-nums", tone(account.balance))}>{money(account.balance)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
