"use client";

import { useMemo } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useAccounts } from "@/hooks/use-accounts";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { useCategories } from "@/hooks/use-categories";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useOutbox } from "@/hooks/use-outbox";
import { requestReplay } from "@/lib/offline/replay";
import { discardQueued, retryQueued } from "@/lib/offline/submission";
import type { OutboxItem } from "@/lib/offline/outbox";
import { formatSignedAmount, nameMap, titleOf, type Names } from "@/lib/transaction-format";

function PendingRow({
  item,
  accounts,
  categories,
}: {
  item: OutboxItem;
  accounts: Names;
  categories: Names;
}) {
  const money = useAmountFormat();
  const { body } = item;
  const title = titleOf(body, accounts, categories);
  const fee = body.type === "transfer" ? body.fee : undefined;
  const failed = item.status === "failed";

  return (
    <li className="flex flex-col gap-2 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{title}</p>
          <p className="truncate text-sm text-muted-foreground">
            {accounts.get(body.accountId) ?? "Akun"}
            {body.description && ` · ${body.description}`}
            {fee && ` · biaya admin ${money(fee.amount)}`}
          </p>
        </div>
        <p className="shrink-0 font-medium tabular-nums">
          {money(body.amount, (amount) => formatSignedAmount(body.type, amount))}
        </p>
      </div>
      <p
        className={
          failed ? "text-sm font-medium text-destructive" : "text-sm text-muted-foreground"
        }
      >
        <span className="rounded-full border px-2 py-0.5 text-xs font-bold">
          {failed ? "Gagal" : "Tertunda"}
        </span>
        {failed && item.error && ` ${item.error.message}`}
      </p>
      <div className="flex flex-wrap gap-2">
        {failed && (
          <Button
            variant="outline"
            className="h-11 text-base"
            onClick={() => void retryQueued(item.id)}
          >
            Coba lagi
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger render={<Button variant="ghost" className="h-11 text-base" />}>
            Buang
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Buang transaksi ini?</AlertDialogTitle>
              <AlertDialogDescription>
                Transaksi belum terkirim dan akan hilang dari perangkat ini.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="h-11 text-base">Batal</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                className="h-11 text-base"
                onClick={() => void discardQueued(item.id)}
              >
                Buang
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  );
}

export function PendingTransactions() {
  const items = useOutbox();
  const online = useOnlineStatus();
  const accounts = useAccounts({ includeArchived: true });
  const categories = useCategories({ includeArchived: true });
  const accountNames = useMemo(() => nameMap(accounts.data), [accounts.data]);
  const categoryNames = useMemo(() => nameMap(categories.data), [categories.data]);

  return (
    <div aria-live="polite">
      {items.length > 0 && (
        <section
          aria-labelledby="pending-heading"
          className="flex flex-col gap-2 surface px-5 py-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="pending-heading" className="font-heading text-lg font-bold">
              Menunggu dikirim ({items.length})
            </h2>
            {online && items.some((i) => i.status === "pending") && (
              <Button variant="outline" className="h-11 text-base" onClick={requestReplay}>
                Kirim sekarang
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Belum masuk saldo dan ringkasan sampai terkirim.
          </p>
          <ul className="divide-y">
            {items.map((item) => (
              <PendingRow
                key={item.id}
                item={item}
                accounts={accountNames}
                categories={categoryNames}
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
