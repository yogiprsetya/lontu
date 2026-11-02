"use client";

import Link from "next/link";
import { TrendingUpIcon } from "lucide-react";
import { SectionTitle } from "@/components/layout/section-title";
import { buttonVariants } from "@/components/ui/button";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { archiveLabel } from "@/lib/archived";
import { ACCOUNT_SUBTYPE_LABELS, type Account } from "@/lib/schemas/account";
import type { AssetValuation } from "@/lib/schemas/valuation";
import { cn } from "@/lib/utils";
import { formatMarketGain, isStale, valuedLabel } from "@/lib/valuation-format";

export function NoAssets() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center">
      <p className="text-muted-foreground">
        Belum ada akun aset. Buat akun aset untuk reksadana atau emas di Settings, lalu perbarui
        nilainya di sini tiap bulan.
      </p>
      <Link href="/settings" className={cn(buttonVariants(), "h-11 text-base")}>
        Buka Settings
      </Link>
    </div>
  );
}

function AssetRow({
  asset,
  account,
  today,
}: {
  asset: AssetValuation;
  account: Account | undefined;
  today: string;
}) {
  const money = useAmountFormat();
  const stale = isStale(asset.lastValuedAt, today);
  const subtype = account?.subtype ? ACCOUNT_SUBTYPE_LABELS[account.subtype] : "Aset";
  return (
    <li className="flex min-h-16 flex-col gap-1 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate font-bold">{account ? archiveLabel(account) : "Akun"}</p>
        <p className="shrink-0 font-heading text-lg font-extrabold">{money(asset.balance)}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Disetor {money(asset.contributed)} · Pasar {money(asset.marketGain, formatMarketGain)}
      </p>
      <p className={cn("text-sm", stale ? "font-semibold text-expense" : "text-muted-foreground")}>
        {subtype} · {valuedLabel(asset.lastValuedAt, today)}
      </p>
    </li>
  );
}

export function AssetValues({
  assets,
  accounts,
  today,
}: {
  assets: AssetValuation[];
  accounts: Map<string, Account>;
  today: string;
}) {
  return (
    <section aria-labelledby="asset-values" className="flex flex-col gap-3 surface px-5 py-5">
      <SectionTitle id="asset-values" icon={TrendingUpIcon} tone="mint">
        Nilai aset
      </SectionTitle>
      <ul className="divide-y">
        {assets.map((asset) => (
          <AssetRow
            key={asset.accountId}
            asset={asset}
            account={accounts.get(asset.accountId)}
            today={today}
          />
        ))}
      </ul>
    </section>
  );
}
