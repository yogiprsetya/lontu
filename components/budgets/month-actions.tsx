"use client";

import { CopyIcon, EllipsisVerticalIcon, SparklesIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  copyFromPreviousMonth,
  previousMonthLabel,
} from "@/components/budgets/copy-from-previous-month";
import type { BudgetPeriod } from "@/lib/schemas/budget";
import { shiftPeriod } from "@/lib/period";

export function MonthActions({
  period,
  onSuggest,
}: {
  period: BudgetPeriod;
  onSuggest: () => void;
}) {
  const canCopy = shiftPeriod(period, -1) !== period;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Aksi bulan"
        className="inline-flex size-14 shrink-0 items-center justify-center rounded-2xl bg-card shadow-soft outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <EllipsisVerticalIcon className="size-5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="min-w-56">
        <DropdownMenuItem
          className="min-h-11 gap-3 text-base"
          disabled={!canCopy}
          onClick={() => void copyFromPreviousMonth(period)}
        >
          <CopyIcon className="size-5" aria-hidden />
          Salin dari {previousMonthLabel(period)}
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11 gap-3 text-base" onClick={onSuggest}>
          <SparklesIcon className="size-5" aria-hidden />
          Saran 50/30/20
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
