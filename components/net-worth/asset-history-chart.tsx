"use client";

import { CartesianGrid, Line, LineChart, type TooltipContentProps, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { useAmountsHidden } from "@/hooks/use-amount-format";
import { formatBucket } from "@/lib/dashboard-format";
import { abbreviateIDR, formatIDR } from "@/lib/money";
import type { AssetHistoryMonth } from "@/lib/schemas/asset-history";
import { formatMarketGain } from "@/lib/valuation-format";

const config = {
  value: { label: "Nilai", color: "var(--chart-1)" },
  contributed: { label: "Disetor", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

const DASH = "6 4";

/**
 * Not from 0 (SPEC-asset-history #3): a few hundred thousand must show on tens of millions.
 * Padded so a flat line does not sit on the edge.
 */
function domain([min, max]: readonly [number, number]): [number, number] {
  const pad = Math.max((max - min) * 0.1, Math.abs(max) * 0.01, 1);
  return [min >= 0 ? Math.max(0, min - pad) : min - pad, max + pad];
}

function Tooltip({ active, payload }: TooltipContentProps) {
  const month = payload?.[0]?.payload as AssetHistoryMonth | undefined;
  if (!active || !month) return null;
  return (
    <div className="grid min-w-32 gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium">{formatBucket(month.month, "full")}</p>
      <dl className="grid grid-cols-[auto_auto] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Nilai</dt>
        <dd className="text-right font-medium">{formatIDR(month.value)}</dd>
        <dt className="text-muted-foreground">Disetor</dt>
        <dd className="text-right font-medium">{formatIDR(month.contributed)}</dd>
        <dt className="text-muted-foreground">Pasar</dt>
        <dd className="text-right font-medium">{formatMarketGain(month.marketGain)}</dd>
      </dl>
    </div>
  );
}

function LegendLine({ dashed }: { dashed?: boolean }) {
  return (
    <svg width="24" height="8" className="shrink-0">
      <line
        x1="0"
        y1="4"
        x2="24"
        y2="4"
        stroke={dashed ? "var(--muted-foreground)" : "var(--chart-1)"}
        strokeWidth="2.5"
        strokeDasharray={dashed ? DASH : undefined}
      />
    </svg>
  );
}

/** Loaded with next/dynamic so Recharts stays out of the first load. Hidden from screen readers; the summary and table are its text. */
export default function AssetHistoryChart({ months }: { months: AssetHistoryMonth[] }) {
  const hidden = useAmountsHidden();
  return (
    <div aria-hidden className="flex flex-col gap-2">
      {/* Solid vs dashed, so the two lines differ without colour. */}
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <LegendLine />
          Nilai
        </span>
        <span className="flex items-center gap-1.5">
          <LegendLine dashed />
          Disetor
        </span>
      </div>
      <ChartContainer config={config} className="aspect-auto h-56 w-full">
        <LineChart data={months} margin={{ left: 0, right: 8, top: 8 }} accessibilityLayer={false}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            minTickGap={8}
            tickFormatter={(month: string) => formatBucket(month, "tick")}
          />
          <YAxis
            hide={hidden}
            width={48}
            tickLine={false}
            axisLine={false}
            domain={domain}
            tickFormatter={(value: number) => abbreviateIDR(value)}
          />
          {!hidden && <ChartTooltip cursor content={Tooltip} />}
          <Line dataKey="value" stroke="var(--color-value)" strokeWidth={2.5} dot={false} />
          <Line
            dataKey="contributed"
            stroke="var(--color-contributed)"
            strokeWidth={2}
            strokeDasharray={DASH}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
