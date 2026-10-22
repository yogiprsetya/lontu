"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { todayInJakarta } from "@/lib/date";
import {
  formatPeriodLabel,
  periodMode,
  shiftPeriod,
  switchPeriodMode,
  type Period,
  type PeriodMode,
} from "@/lib/transaction-filters";

const MODES: { value: PeriodMode; label: string }[] = [
  { value: "month", label: "Bulan" },
  { value: "year", label: "Tahun" },
  { value: "all", label: "Semua" },
];

export function PeriodStepper({ period, onChange }: { period: Period; onChange: (period: Period) => void }) {
  const today = todayInJakarta();
  const mode = periodMode(period);
  // Nothing can be recorded after today, so stepping past the current period only shows an empty list.
  const next = shiftPeriod(period, 1);
  const canGoNext = mode !== "all" && next <= today.slice(0, mode === "month" ? 7 : 4);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center justify-between gap-1">
        <Button
          variant="outline"
          className="size-11 shrink-0"
          aria-label="Periode sebelumnya"
          disabled={mode === "all"}
          onClick={() => onChange(shiftPeriod(period, -1))}
        >
          <ChevronLeftIcon aria-hidden />
        </Button>
        <p className="min-w-0 flex-1 truncate text-center text-base font-semibold" aria-live="polite">
          {formatPeriodLabel(period)}
        </p>
        <Button
          variant="outline"
          className="size-11 shrink-0"
          aria-label="Periode berikutnya"
          disabled={!canGoNext}
          onClick={() => onChange(next)}
        >
          <ChevronRightIcon aria-hidden />
        </Button>
      </div>
      <Select
        items={MODES}
        value={mode}
        onValueChange={(value) => value && onChange(switchPeriodMode(period, value as PeriodMode, today))}
      >
        <SelectTrigger className="w-28 text-base data-[size=default]:h-11 md:text-sm" aria-label="Rentang periode">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {MODES.map((m) => (
            <SelectItem key={m.value} value={m.value} className="min-h-11">
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
