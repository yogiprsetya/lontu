"use client";

import { HistoryIcon } from "lucide-react";
import { SectionTitle } from "@/components/layout/section-title";
import { LoadError } from "@/components/settings/load-error";
import { Skeleton } from "@/components/ui/skeleton";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { useAssetHistory } from "@/hooks/use-asset-history";
import {
  assetHistorySummary,
  formatShortIDR,
  formatSignedShortIDR,
  summarySentence,
} from "@/lib/asset-history";
import { formatTargetMonth } from "@/lib/goal-format";
import { formatIDR } from "@/lib/money";
import type { AssetHistoryMonth } from "@/lib/schemas/asset-history";
import { formatMarketGain } from "@/lib/valuation-format";

/** Abbreviated below `sm` so four columns fit 360 px; only one span shows, so one number is read. */
function Amount({
  amount,
  short,
  full,
}: {
  amount: number;
  short: (amount: number) => string;
  full: (amount: number) => string;
}) {
  const money = useAmountFormat();
  return (
    <>
      <span className="sm:hidden">{money(amount, short)}</span>
      <span className="hidden sm:inline">{money(amount, full)}</span>
    </>
  );
}

function HistoryTable({ months }: { months: AssetHistoryMonth[] }) {
  const current = months.at(-1)?.month;
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Histori nilai per bulan, terbaru di atas</caption>
      <thead className="text-xs text-muted-foreground">
        <tr>
          <th scope="col" className="py-2 pr-2 text-left font-semibold">
            Bulan
          </th>
          <th scope="col" className="px-1 py-2 text-right font-semibold">
            Setoran
          </th>
          <th scope="col" className="px-1 py-2 text-right font-semibold">
            Pasar
          </th>
          <th scope="col" className="py-2 pl-1 text-right font-semibold">
            Nilai
          </th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {months.toReversed().map((m) => (
          <tr key={m.month}>
            <th scope="row" className="py-2.5 pr-2 text-left font-semibold">
              {formatTargetMonth(m.month)}
              {m.month === current && (
                <span className="block text-xs font-normal text-muted-foreground">berjalan</span>
              )}
            </th>
            <td className="px-1 py-2.5 text-right">
              <Amount
                amount={m.contributionChange}
                short={formatSignedShortIDR}
                full={formatMarketGain}
              />
            </td>
            <td className="px-1 py-2.5 text-right">
              <Amount
                amount={m.marketChange}
                short={formatSignedShortIDR}
                full={formatMarketGain}
              />
            </td>
            <td className="py-2.5 pl-1 text-right font-bold">
              <Amount amount={m.value} short={formatShortIDR} full={formatIDR} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Section "Histori nilai" on /net-worth (SPEC-asset-history § UI). */
export function AssetHistory() {
  const money = useAmountFormat();
  const { data, error, mutate } = useAssetHistory({ range: "12", accountId: null });

  let content;
  if (error) {
    content = <LoadError message="Gagal memuat histori nilai." onRetry={() => void mutate()} />;
  } else if (!data) {
    content = (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat histori nilai">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  } else {
    const summary = assetHistorySummary(data);
    content = (
      <>
        {summary && <p className="font-semibold">{summarySentence(summary, money)}</p>}
        <HistoryTable months={data.months} />
      </>
    );
  }

  return (
    <section
      aria-labelledby="asset-history"
      className="flex min-w-0 flex-col gap-3 surface px-5 py-5"
    >
      <SectionTitle id="asset-history" icon={HistoryIcon} tone="sky">
        Histori nilai
      </SectionTitle>
      {content}
    </section>
  );
}
