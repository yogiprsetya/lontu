"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useAmountsHidden } from "@/hooks/use-amount-format";
import { formatBucket } from "@/lib/dashboard-format";
import { abbreviateIDR, formatIDR } from "@/lib/money";
import type { DashboardSummary } from "@/lib/schemas/dashboard";

const config = { expense: { label: "Expense", color: "var(--expense)" } } satisfies ChartConfig;

type Props = { activity: DashboardSummary["activity"] };

/** Loaded with next/dynamic so Recharts stays out of the first load. Hidden from screen readers; the section has a text alternative. */
export default function ExpenseActivityChart({ activity }: Props) {
  const hidden = useAmountsHidden();
  return (
    <ChartContainer config={config} className="aspect-auto h-56 w-full" aria-hidden>
      <BarChart data={activity} margin={{ left: 0, right: 0, top: 8 }} accessibilityLayer={false}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={false}
          minTickGap={8}
          tickFormatter={(bucket: string) => formatBucket(bucket, "tick")}
        />
        <YAxis
          hide={hidden}
          width={48}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => abbreviateIDR(value)}
        />
        {!hidden && (
          <ChartTooltip
            cursor
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) =>
                  formatBucket(String(payload[0]?.payload?.bucket ?? ""), "full")
                }
                formatter={(value) => formatIDR(Number(value))}
                hideIndicator
              />
            }
          />
        )}
        <Bar dataKey="expense" fill="var(--color-expense)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
