"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";

type Props = { slices: { key: string; amount: number; color: string }[]; centerLabel: string };

const config = {} satisfies ChartConfig;

/** Loaded with next/dynamic. Decorative: the legend next to it is the accessible version. */
export default function CategoryDonutChart({ slices, centerLabel }: Props) {
  return (
    <div className="relative mx-auto size-48" aria-hidden>
      <ChartContainer config={config} className="aspect-square size-48">
        <PieChart accessibilityLayer={false}>
          <Pie
            data={slices}
            dataKey="amount"
            nameKey="key"
            innerRadius="62%"
            outerRadius="100%"
            strokeWidth={2}
            isAnimationActive={false}
          >
            {slices.map((slice) => (
              <Cell key={slice.key} fill={slice.color} className="stroke-background" />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-10 text-center">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="max-w-full truncate text-sm font-semibold tabular-nums">
          {centerLabel}
        </span>
      </div>
    </div>
  );
}
