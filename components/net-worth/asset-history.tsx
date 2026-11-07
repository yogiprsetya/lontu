"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { HistoryIcon } from "lucide-react";
import { SectionTitle } from "@/components/layout/section-title";
import { LoadError } from "@/components/settings/load-error";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { useAssetHistory } from "@/hooks/use-asset-history";
import {
  assetHistorySummary,
  formatShortIDR,
  formatSignedShortIDR,
  summarySentence,
} from "@/lib/asset-history";
import { formatTargetMonth } from "@/lib/net-worth-format";
import { formatIDR } from "@/lib/money";
import type { Account } from "@/lib/schemas/account";
import {
  ASSET_HISTORY_RANGES,
  type AssetHistoryMonth,
  type AssetHistoryRange,
} from "@/lib/schemas/asset-history";
import type { AssetValuation } from "@/lib/schemas/valuation";
import { formatMarketGain } from "@/lib/valuation-format";

const RANGE_LABELS: Record<AssetHistoryRange, string> = {
  "6": "6 bln",
  "12": "12 bln",
  all: "Semua",
};

const ALL = "all";

// Legend + chart height, so nothing shifts when Recharts arrives.
const chartSkeleton = () => <Skeleton className="h-63 w-full" />;

const AssetHistoryChart = dynamic(() => import("@/components/net-worth/asset-history-chart"), {
  ssr: false,
  loading: chartSkeleton,
});

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

/** Section "Histori nilai" on /net-worth (SPEC-asset-history § UI). Range and account are local state (#12). */
export function AssetHistory({
  assets,
  accounts,
}: {
  assets: AssetValuation[];
  accounts: Map<string, Account>;
}) {
  const money = useAmountFormat();
  const [range, setRange] = useState<AssetHistoryRange>("12");
  const [selected, setSelected] = useState(ALL);
  // An account archived since it was picked is no longer listed: fall back to every asset, not a 404.
  const accountId = assets.some((a) => a.accountId === selected) ? selected : null;
  const { data, error, mutate } = useAssetHistory({ range, accountId });
  const accountItems = [
    { value: ALL, label: "Semua aset" },
    ...assets.map((a) => ({
      value: a.accountId,
      label: accounts.get(a.accountId)?.name ?? "Akun",
    })),
  ];

  let content;
  if (error) {
    content = <LoadError message="Gagal memuat histori nilai." onRetry={() => void mutate()} />;
  } else if (!data) {
    content = (
      <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat histori nilai">
        <Skeleton className="h-5 w-3/4" />
        {chartSkeleton()}
      </div>
    );
  } else {
    const summary = assetHistorySummary(data);
    content = (
      <>
        {summary && <p className="font-semibold">{summarySentence(summary, money)}</p>}
        {data.months.length >= 2 ? (
          <AssetHistoryChart months={data.months} />
        ) : (
          <p className="text-sm text-muted-foreground">Grafik muncul setelah ada data dua bulan.</p>
        )}
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
      <div className="flex flex-col gap-2 sm:flex-row">
        <ToggleGroup
          variant="outline"
          spacing={0}
          className="grid w-full grid-cols-3 sm:w-auto"
          aria-label="Rentang histori"
          value={[range]}
          onValueChange={(next) => next[0] && setRange(next[0] as AssetHistoryRange)}
        >
          {ASSET_HISTORY_RANGES.map((r) => (
            <ToggleGroupItem key={r} value={r}>
              {RANGE_LABELS[r]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {assets.length >= 2 && (
          <div className="min-w-0 sm:flex-1">
            <Label htmlFor="asset-history-account" className="sr-only">
              Akun
            </Label>
            <Select
              items={accountItems}
              value={accountId ?? ALL}
              onValueChange={(v) => v && setSelected(v)}
            >
              <SelectTrigger id="asset-history-account">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {accountItems.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {content}
    </section>
  );
}
