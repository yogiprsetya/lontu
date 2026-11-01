"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCwIcon, TrendingUpIcon } from "lucide-react";
import { ValuationSheet } from "@/components/goals/valuation-sheet";
import { SectionTitle } from "@/components/layout/section-title";
import { LoadError } from "@/components/settings/load-error";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useValuations } from "@/hooks/use-valuations";
import { archiveLabel } from "@/lib/archived";
import { todayInJakarta } from "@/lib/date";
import { ACCOUNT_SUBTYPE_LABELS, type Account } from "@/lib/schemas/account";
import type { AssetValuation } from "@/lib/schemas/valuation";
import { cn } from "@/lib/utils";
import { formatMarketGain, isStale, valuedLabel } from "@/lib/valuation-format";

function ViewSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat nilai aset">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function NoAssets() {
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

export function GoalsView() {
  const [valuing, setValuing] = useState(false);
  const online = useOnlineStatus();
  const valuations = useValuations();
  const accounts = useAccounts({ includeArchived: true });
  const accountsById = useMemo(
    () => new Map(accounts.data?.map((a) => [a.id, a])),
    [accounts.data],
  );
  const today = todayInJakarta();
  const assets = valuations.data;

  const error = valuations.error ?? accounts.error;
  let content;
  if (error) {
    content = (
      <LoadError
        message="Gagal memuat nilai aset."
        onRetry={() => {
          void valuations.mutate();
          void accounts.mutate();
        }}
      />
    );
  } else if (!assets || !accounts.data) {
    content = <ViewSkeleton />;
  } else if (assets.length === 0) {
    content = <NoAssets />;
  } else {
    content = (
      <section aria-labelledby="asset-values" className="flex flex-col gap-3 surface px-5 py-5">
        <SectionTitle id="asset-values" icon={TrendingUpIcon} tone="mint">
          Nilai aset
        </SectionTitle>
        <ul className="divide-y">
          {assets.map((asset) => (
            <AssetRow
              key={asset.accountId}
              asset={asset}
              account={accountsById.get(asset.accountId)}
              today={today}
            />
          ))}
        </ul>
      </section>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Button
          className="h-11 self-start text-base"
          disabled={!online || !assets?.length}
          onClick={() => setValuing(true)}
        >
          <RefreshCwIcon aria-hidden />
          Perbarui nilai
        </Button>
        {!online && (
          <p className="text-sm text-muted-foreground">Butuh koneksi untuk memperbarui nilai.</p>
        )}
      </div>
      {content}
      <ValuationSheet
        open={valuing}
        onClose={() => setValuing(false)}
        assets={assets ?? []}
        accounts={accountsById}
      />
    </>
  );
}
