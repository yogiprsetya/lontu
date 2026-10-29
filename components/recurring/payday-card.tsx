"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDaysIcon, ChevronDownIcon } from "lucide-react";
import { SectionTitle } from "@/components/layout/section-title";
import { RecordOccurrenceModal } from "@/components/recurring/occurrence-actions";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useRecurring } from "@/hooks/use-recurring";
import { todayInJakarta } from "@/lib/date";
import { formatFree, formatPaydayHeadline, formatShortDate } from "@/lib/recurring-format";
import { cn } from "@/lib/utils";

const LINK_CLASS = "inline-flex min-h-11 items-center self-start font-bold underline underline-offset-4";

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section aria-labelledby="payday-title" className="surface flex flex-col gap-3 px-5 py-5">
      <SectionTitle id="payday-title" icon={CalendarDaysIcon} tone="mint">
        Sampai gajian
      </SectionTitle>
      {children}
    </section>
  );
}

/** "How much can I spend until payday": the recurring module's forecast on the dashboard. */
export function PaydayCard() {
  const { data, error, mutate } = useRecurring();
  const online = useOnlineStatus();
  const money = useAmountFormat();
  const [recording, setRecording] = useState(false);
  const today = todayInJakarta();

  if (error) return <LoadError message="Gagal memuat proyeksi gajian." onRetry={() => void mutate()} />;
  if (!data) return <Skeleton className="h-44 w-full rounded-2xl" aria-busy="true" />;

  const { forecast, rules } = data;

  if (rules.length === 0) {
    return (
      <Card>
        <p className="text-muted-foreground">Daftarkan gaji dan tagihan tetap untuk melihat berapa yang bebas sampai gajian.</p>
        <Link href="/recurring" className={LINK_CLASS}>
          Atur gajian & tagihan tetap
        </Link>
      </Card>
    );
  }

  if (forecast.status === "no_payday") {
    return (
      <Card>
        <p className="text-muted-foreground">Tandai aturan gaji untuk melihat proyeksi.</p>
        <Link href="/recurring" className={LINK_CLASS}>
          Buka Recurring
        </Link>
      </Card>
    );
  }

  if (forecast.status === "payday_due") {
    const payday = rules.find((r) => r.id === forecast.ruleId);
    return (
      <Card>
        <p className="font-bold">Gaji belum dicatat</p>
        <p className="text-sm text-muted-foreground">
          Jatuh tempo {formatShortDate(forecast.dueDate, today)}. Catat dulu supaya proyeksi siklus berikutnya bisa dihitung.
        </p>
        <Button className="h-11 self-start text-base" disabled={!online || !payday} onClick={() => setRecording(true)}>
          Catat gaji
        </Button>
        {!online && <p className="text-sm text-muted-foreground">Butuh koneksi untuk mencatat.</p>}
        <RecordOccurrenceModal rule={recording ? payday : undefined} onClose={() => setRecording(false)} />
      </Card>
    );
  }

  const free = formatFree(forecast.free, money);
  const names = new Map(rules.map((r) => [r.id, r.name]));

  return (
    <Card>
      <p className="font-bold">{formatPaydayHeadline(forecast, today)}</p>
      <dl className="grid grid-cols-2 gap-2">
        <div className="min-w-0 rounded-2xl bg-muted px-3 py-2">
          <dt className="text-sm font-semibold text-muted-foreground">Terikat</dt>
          <dd className="truncate font-heading text-xl font-extrabold tabular-nums">{money(forecast.committed)}</dd>
        </div>
        <div className="min-w-0 rounded-2xl bg-mint px-3 py-2 text-mint-foreground">
          <dt className="text-sm font-semibold">{free.label}</dt>
          <dd className={cn("truncate font-heading text-xl font-extrabold tabular-nums", free.short && "text-expense")}>{free.amount}</dd>
        </div>
      </dl>
      <details className="group">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-bold [&::-webkit-details-marker]:hidden">
          {forecast.items.length === 0 ? "Tidak ada tagihan sebelum gajian" : `Rincian ${forecast.items.length} tagihan`}
          <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <ul className="divide-y">
          {forecast.items.map((item) => (
            <li key={`${item.ruleId}-${item.dueDate}`} className="flex min-h-11 items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                {names.get(item.ruleId) ?? "Aturan"} · {formatShortDate(item.dueDate, today)}
              </span>
              <span className="shrink-0 font-bold tabular-nums">{money(item.amount)}</span>
            </li>
          ))}
        </ul>
        <Link href="/recurring" className={cn(LINK_CLASS, "text-sm")}>
          Kelola di Recurring
        </Link>
      </details>
      <p className="text-sm text-muted-foreground">Saldo akun transaksi {money(forecast.spendable)}, tanpa kartu kredit dan aset.</p>
    </Card>
  );
}
