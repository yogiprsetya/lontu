"use client";

import { useMemo } from "react";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { useTransactions } from "@/hooks/use-transactions";
import { todayInJakarta } from "@/lib/date";
import type { Transaction } from "@/lib/schemas/transaction";
import {
  amountTone,
  formatDateHeading,
  formatSignedAmount,
  groupByDate,
  type AmountTone,
} from "@/lib/transaction-format";
import { ADJUSTMENT_LABEL } from "@/lib/transaction-types";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";

const TONE_CLASS: Record<AmountTone, string> = {
  income: "text-income",
  expense: "text-expense",
  budget: "text-budget",
  transfer: "text-transfer",
};

type Names = Map<string, string>;

function nameMap(items: { id: string; name: string; archivedAt: string | null }[] | undefined): Names {
  return new Map(items?.map((i) => [i.id, i.archivedAt ? `${i.name} (arsip)` : i.name]));
}

function titleOf(t: Transaction, accounts: Names, categories: Names) {
  if (t.type === "transfer") return `${accounts.get(t.accountId) ?? "Akun"} → ${accounts.get(t.toAccountId!) ?? "Akun"}`;
  if (t.type === "adjustment") return ADJUSTMENT_LABEL;
  return (t.categoryId && categories.get(t.categoryId)) || "Tanpa kategori";
}

function Row({ t, accounts, categories, hideAmounts }: { t: Transaction; accounts: Names; categories: Names; hideAmounts: boolean }) {
  return (
    <li className="flex min-h-14 items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="truncate font-medium">{titleOf(t, accounts, categories)}</p>
        <p className="truncate text-sm text-muted-foreground">
          {accounts.get(t.accountId) ?? "Akun"}
          {t.description && ` · ${t.description}`}
        </p>
      </div>
      <p className={cn("shrink-0 font-medium tabular-nums", TONE_CLASS[amountTone(t.type, t.amount)])}>
        {hideAmounts ? "Rp•••••" : formatSignedAmount(t.type, t.amount)}
      </p>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function TransactionList() {
  const hideAmounts = useUIStore((s) => s.hideAmounts);
  const tx = useTransactions();
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
      <div className="rounded-lg border border-dashed px-6 py-12 text-center text-muted-foreground">
        Belum ada transaksi. Tekan + untuk mencatat yang pertama.
      </div>
    );
  }

  const today = todayInJakarta();
  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.date} aria-labelledby={`day-${group.date}`}>
          <h2 id={`day-${group.date}`} className="text-sm font-semibold text-muted-foreground">
            {formatDateHeading(group.date, today)}
          </h2>
          <ul className="divide-y">
            {group.items.map((t) => (
              <Row key={t.id} t={t} accounts={accountNames} categories={categoryNames} hideAmounts={hideAmounts} />
            ))}
          </ul>
        </section>
      ))}
      {tx.hasMore && (
        <Button
          variant="outline"
          className="h-11 text-base"
          disabled={tx.isLoadingMore}
          onClick={() => void tx.setSize(tx.size + 1)}
        >
          {tx.isLoadingMore ? "Memuat…" : "Muat lebih banyak"}
        </Button>
      )}
    </div>
  );
}
