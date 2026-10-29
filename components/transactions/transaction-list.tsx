"use client";

import { useMemo } from "react";
import Link from "next/link";
import { PendingTransactions } from "@/components/pwa/pending-transactions";
import { LoadError } from "@/components/settings/load-error";
import { TypeChip } from "@/components/transactions/type-chip";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { todayInJakarta } from "@/lib/date";
import type { Transaction } from "@/lib/schemas/transaction";
import {
  AMOUNT_TONE_CLASS,
  amountTone,
  formatDateHeading,
  formatSignedAmount,
  groupByDate,
  nameMap,
  titleOf,
  type Names,
} from "@/lib/transaction-format";
import type { ListFilters } from "@/lib/transaction-filters";
import { cn } from "@/lib/utils";

function Row({ t, accounts, categories }: { t: Transaction; accounts: Names; categories: Names }) {
  const money = useAmountFormat();
  return (
    <li>
      <Link href={`/transactions/${t.id}`} className="flex min-h-16 items-center gap-3 py-3">
        <TypeChip type={t.type} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{titleOf(t, accounts, categories)}</p>
          <p className="truncate text-sm text-muted-foreground">
            {accounts.get(t.accountId) ?? "Akun"}
            {t.description && ` · ${t.description}`}
          </p>
        </div>
        <p className={cn("shrink-0 font-bold tabular-nums", AMOUNT_TONE_CLASS[amountTone(t.type, t.amount)])}>
          {money(t.amount, (amount) => formatSignedAmount(t.type, amount))}
        </p>
      </Link>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  );
}

// Queued creates sit above the list whatever the filters, so they are never hidden by one.
export function TransactionList({ filters }: { filters: ListFilters }) {
  return (
    <div className="flex flex-col gap-6">
      <PendingTransactions />
      <SavedTransactions filters={filters} />
    </div>
  );
}

function SavedTransactions({ filters }: { filters: ListFilters }) {
  const tx = useTransactions(filters);
  const accounts = useAccounts({ includeArchived: true });
  const categories = useCategories({ includeArchived: true });
  const accountNames = useMemo(() => nameMap(accounts.data), [accounts.data]);
  const categoryNames = useMemo(() => nameMap(categories.data), [categories.data]);
  const groups = useMemo(() => groupByDate(tx.items ?? []), [tx.items]);

  const error = tx.error ?? accounts.error ?? categories.error;
  if (error) {
    return (
      <LoadError
        message="Gagal memuat transaksi."
        onRetry={() => {
          void tx.mutate();
          void accounts.mutate();
          void categories.mutate();
        }}
      />
    );
  }
  if (!tx.items || !accounts.data || !categories.data) return <ListSkeleton />;
  if (tx.items.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed px-6 py-12 text-center text-muted-foreground">
        {filters.period === "all" && !filters.type && !filters.accountId && !filters.categoryId
          ? "Belum ada transaksi. Tekan + untuk mencatat yang pertama."
          : "Tidak ada transaksi yang cocok dengan filter ini."}
      </div>
    );
  }

  const today = todayInJakarta();
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.date} aria-labelledby={`day-${group.date}`}>
          <h2 id={`day-${group.date}`} className="mb-2 px-1 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
            {formatDateHeading(group.date, today)}
          </h2>
          <ul className="surface divide-y px-4">
            {group.items.map((t) => (
              <Row key={t.id} t={t} accounts={accountNames} categories={categoryNames} />
            ))}
          </ul>
        </section>
      ))}
      {tx.hasMore && (
        <Button
          variant="outline"
          className="h-11 rounded-full text-base font-bold"
          disabled={tx.isLoadingMore}
          onClick={() => void tx.setSize(tx.size + 1)}
        >
          {tx.isLoadingMore ? "Memuat…" : "Muat lebih banyak"}
        </Button>
      )}
    </div>
  );
}
