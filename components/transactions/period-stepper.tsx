"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { selectItemClass } from "@/components/forms/field-styles";
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

type Props = {
  period: Period;
  onChange: (period: Period) => void;
  /** Which ranges the select offers; month and year by default. */
  modes?: readonly PeriodMode[];
};

export function PeriodStepper({
  period,
  onChange,
  modes = ["month", "year"],
}: Props) {
  const today = todayInJakarta();
  const items = MODES.filter((m) => modes.includes(m.value));
  const mode = periodMode(period);
  // Nothing can be recorded after today, so stepping past the current period only shows an empty list.
  const next = shiftPeriod(period, 1);
  const canGoNext =
    mode !== "all" && next <= today.slice(0, mode === "month" ? 7 : 4);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="surface flex min-w-0 flex-1 items-center justify-between gap-1 p-1.5">
        <Button
          variant="secondary"
          className="size-11 shrink-0"
          aria-label="Periode sebelumnya"
          disabled={shiftPeriod(period, -1) === period}
          onClick={() => onChange(shiftPeriod(period, -1))}
        >
          <ChevronLeftIcon aria-hidden />
        </Button>
        <p
          className="min-w-0 flex-1 truncate text-center font-heading text-base font-bold sm:text-lg"
          aria-live="polite"
        >
          {formatPeriodLabel(period)}
        </p>
        <Button
          variant="secondary"
          className="size-11 shrink-0"
          aria-label="Periode berikutnya"
          disabled={!canGoNext}
          onClick={() => onChange(next)}
        >
          <ChevronRightIcon aria-hidden />
        </Button>
      </div>
      <Select
        items={items}
        value={mode}
        onValueChange={(value) =>
          value &&
          onChange(switchPeriodMode(period, value as PeriodMode, today))
        }
      >
        <SelectTrigger
          className="w-36 rounded-2xl border-0 bg-card pr-3.5 pl-4 text-base font-bold shadow-soft data-[size=default]:h-14 dark:bg-card"
          aria-label="Rentang periode"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false}>
          {items.map((m) => (
            <SelectItem
              key={m.value}
              value={m.value}
              className={selectItemClass}
            >
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
