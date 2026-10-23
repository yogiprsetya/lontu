"use client";

import { useAccounts } from "@/hooks/use-accounts";
import { todayInJakarta } from "@/lib/date";
import type { Transaction } from "@/lib/schemas/transaction";
import { amountTone, formatDateHeading, formatSignedAmount } from "@/lib/transaction-format";
import { ADJUSTMENT_LABEL } from "@/lib/transaction-types";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";

const TONE_CLASS = { income: "text-income", expense: "text-expense", budget: "text-budget", transfer: "text-transfer" };

/** Adjustments come from changing an account's opening balance, so they are shown but not edited. */
export function AdjustmentCard({ transaction }: { transaction: Transaction }) {
  const { data: accounts } = useAccounts({ includeArchived: true });
  const hideAmounts = useUIStore((s) => s.hideAmounts);
  const account = accounts?.find((a) => a.id === transaction.accountId);
  const rows: [string, React.ReactNode][] = [
    ["Jenis", ADJUSTMENT_LABEL],
    ["Tanggal", formatDateHeading(transaction.date, todayInJakarta())],
    ["Akun", account ? (account.archivedAt ? `${account.name} (arsip)` : account.name) : "…"],
    [
      "Jumlah",
      <span key="amount" className={cn("font-medium tabular-nums", TONE_CLASS[amountTone("adjustment", transaction.amount)])}>
        {hideAmounts ? "Rp•••••" : formatSignedAmount("adjustment", transaction.amount)}
      </span>,
    ],
    ...(transaction.description ? ([["Deskripsi", transaction.description]] as [string, React.ReactNode][]) : []),
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-y rounded-lg border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex min-h-11 items-center justify-between gap-4 px-4 py-2">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        Dibuat saat saldo awal akun diubah. Penyesuaian tidak bisa diedit; menghapusnya mengembalikan saldo awal efektif
        akun.
      </p>
    </div>
  );
}
