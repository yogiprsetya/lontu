"use client";

import { CopyIcon, EllipsisVerticalIcon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { budgetsKey, copyBudgets } from "@/hooks/use-budgets";
import { copyResultMessage } from "@/lib/budget-format";
import { fetcher } from "@/lib/fetcher";
import type { BudgetPeriod, BudgetUsage } from "@/lib/schemas/budget";
import { formatPeriodLabel, shiftPeriod } from "@/lib/transaction-filters";
import { failureMessage } from "@/lib/offline/network-error";

export function previousMonthLabel(period: BudgetPeriod) {
  return formatPeriodLabel(shiftPeriod(period, -1));
}

/** Shared by the menu and the empty-month call to action. */
export async function copyFromPreviousMonth(period: BudgetPeriod) {
  const source = shiftPeriod(period, -1);
  try {
    const { copied } = await copyBudgets(period);
    // Only a zero result needs the source month, to tell "already set" from "nothing there".
    const sourceHasBudgets =
      copied > 0 ||
      (await fetcher<BudgetUsage>(budgetsKey(source)).then(
        (usage) => usage.items.some((i) => i.budget !== null),
        () => false,
      ));
    toast(copyResultMessage(copied, sourceHasBudgets, formatPeriodLabel(source)));
  } catch (err) {
    toast.error(failureMessage(err, "Gagal menyalin budget. Coba lagi."));
  }
}

export function MonthActions({ period, onSuggest }: { period: BudgetPeriod; onSuggest: () => void }) {
  const canCopy = shiftPeriod(period, -1) !== period;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Aksi bulan"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-md border bg-background outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
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
