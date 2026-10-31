"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { todayInJakarta } from "@/lib/date";
import { maxBudgetPeriod, type BudgetPeriod } from "@/lib/schemas/budget";
import { formatPeriodLabel, shiftPeriod } from "@/lib/period";

export function MonthStepper({
  period,
  onChange,
}: {
  period: BudgetPeriod;
  onChange: (period: BudgetPeriod) => void;
}) {
  const previous = shiftPeriod(period, -1);
  const next = shiftPeriod(period, 1);

  return (
    <div className="surface flex min-w-0 flex-1 items-center justify-between gap-1 p-1.5">
      <Button
        variant="secondary"
        className="size-11 shrink-0"
        aria-label="Bulan sebelumnya"
        disabled={previous === period}
        onClick={() => onChange(previous)}
      >
        <ChevronLeftIcon aria-hidden />
      </Button>
      <p
        className="min-w-0 flex-1 truncate text-center font-heading text-lg font-bold"
        aria-live="polite"
      >
        {formatPeriodLabel(period)}
      </p>
      <Button
        variant="secondary"
        className="size-11 shrink-0"
        aria-label="Bulan berikutnya"
        disabled={next > maxBudgetPeriod(todayInJakarta())}
        onClick={() => onChange(next)}
      >
        <ChevronRightIcon aria-hidden />
      </Button>
    </div>
  );
}
