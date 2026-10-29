"use client";

import Link from "next/link";
import { ChevronDownIcon, PiggyBankIcon } from "lucide-react";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { useAmountFormat, useAmountsHidden } from "@/hooks/use-amount-format";
import { sumBalances } from "@/lib/dashboard-format";
import { ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES } from "@/lib/schemas/account";
import type { DashboardPeriod } from "@/lib/schemas/dashboard";
import { filtersToUrl } from "@/lib/transaction-filters";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";

// Sunny stays bright in dark mode, so everything on it uses the sunny-* text tokens, never foreground.
const HERO_CLASS = "relative mt-5 flex flex-col gap-4 rounded-[1.75rem] bg-sunny bg-dots px-5 py-5 text-sunny-foreground shadow-soft [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-sunny-foreground";
const EYEBROW_CLASS = "text-xs font-bold uppercase tracking-[0.14em] text-sunny-muted-foreground";
// Sits where the reference puts its mascot: half over the card's top edge, tilted like a sticker.
function Sticker() {
  return (
    <span
      aria-hidden
      className="absolute -top-6 right-5 flex size-14 rotate-[8deg] items-center justify-center rounded-2xl bg-peach-pop text-white shadow-soft ring-4 ring-card"
    >
      <PiggyBankIcon className="size-7" strokeWidth={2.5} />
    </span>
  );
}

const HERO_BUTTON_CLASS = "h-11 rounded-full bg-sunny-foreground px-5 text-base font-bold text-sunny hover:bg-sunny-foreground/85 focus-visible:ring-sunny-foreground/40";

/** Balances are always today's, whatever the period; the period only scopes the drill-down. */
export function BalanceCard({ period }: { period: DashboardPeriod }) {
  const money = useAmountFormat();
  const hidden = useAmountsHidden();
  const openModal = useUIStore((s) => s.open);
  const { data, error, mutate } = useAccounts();
  const tone = (amount: number) => !hidden && amount < 0 && "text-sunny-alert";

  if (error) return <LoadError message="Gagal memuat saldo." onRetry={() => void mutate()} />;
  if (!data) return <Skeleton className="mt-5 h-52 w-full rounded-[1.75rem]" aria-busy="true" />;

  if (data.length === 0) {
    return (
      <section aria-labelledby="balance-title" className={cn(HERO_CLASS, "items-start")}>
        <Sticker />
        <h2 id="balance-title" className={EYEBROW_CLASS}>
          Total saldo
        </h2>
        <p className="font-semibold">Belum ada akun. Tambahkan akun untuk melihat saldo.</p>
        <Button className={HERO_BUTTON_CLASS} onClick={() => openModal("manageAccounts")}>
          Tambah akun
        </Button>
      </section>
    );
  }

  const { total, byType } = sumBalances(data);

  return (
    <section aria-labelledby="balance-title" className={HERO_CLASS}>
      <Sticker />
      <div className="min-w-0">
        <h2 id="balance-title" className={EYEBROW_CLASS}>
          Total saldo
        </h2>
        <p className={cn("truncate font-heading text-4xl font-extrabold tabular-nums", tone(total))}>{money(total)}</p>
      </div>
      <dl className="grid grid-cols-2 gap-2">
        {ACCOUNT_TYPES.map((type) => (
          <div key={type} className="min-w-0 rounded-2xl bg-sunny-foreground/[0.07] px-3 py-2">
            <dt className="text-sm font-semibold text-sunny-muted-foreground">{ACCOUNT_TYPE_LABELS[type]}</dt>
            <dd className={cn("truncate font-bold tabular-nums", tone(byType[type]))}>{money(byType[type])}</dd>
          </div>
        ))}
      </dl>
      <details className="group -mx-5 border-t border-sunny-foreground/15">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-5 pt-3 text-sm font-bold [&::-webkit-details-marker]:hidden">
          Saldo per akun
          <ChevronDownIcon aria-hidden className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="divide-y divide-sunny-foreground/15 px-5">
          {data.map((account) => (
            <li key={account.id}>
              <Link
                href={`/transactions?${filtersToUrl({ period, accountId: account.id })}`}
                className="flex min-h-11 items-center justify-between gap-3 py-2"
              >
                <span className="min-w-0 truncate font-semibold">{account.name}</span>
                <span className={cn("shrink-0 font-bold tabular-nums", tone(account.balance))}>{money(account.balance)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}
