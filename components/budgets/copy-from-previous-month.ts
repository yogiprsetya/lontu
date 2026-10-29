import { toast } from "sonner";
import { budgetsKey, copyBudgets } from "@/hooks/use-budgets";
import { copyResultMessage } from "@/lib/budget-format";
import { fetcher } from "@/lib/fetcher";
import type { BudgetPeriod, BudgetUsage } from "@/lib/schemas/budget";
import { formatPeriodLabel, shiftPeriod } from "@/lib/period";
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
