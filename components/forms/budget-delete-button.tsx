"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteBudget, restoreBudget } from "@/hooks/use-budgets";
import { ApiError } from "@/lib/fetcher";
import { failureMessage } from "@/lib/offline/network-error";
import { formatPeriodLabel } from "@/lib/period";
import type { BudgetPeriod } from "@/lib/schemas/budget";
import { undoToast } from "@/lib/undo-toast";

type Props = { period: BudgetPeriod; budgetId: string; disabled: boolean; onDone: () => void };

/** Ends the budget from `period` with an undo toast; earlier months keep it. */
export function BudgetDeleteButton({ period, budgetId, disabled, onDone }: Props) {
  // The budget leaves the list at once (optimistic), so the sheet closes before the server answers.
  async function onDelete() {
    onDone();
    try {
      await deleteBudget(period, budgetId);
      undoToast({
        message: "Budget dihapus",
        restore: () =>
          restoreBudget(budgetId).catch((err: unknown) => {
            // Its name or categories went to another budget meanwhile; the server says which.
            if (err instanceof ApiError && err.status === 409) toast.error(err.message);
            else throw err;
          }),
      });
    } catch (err) {
      toast.error(failureMessage(err, "Gagal menghapus budget. Coba lagi."));
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t pt-4">
      <Button
        type="button"
        variant="destructive"
        disabled={disabled}
        onClick={() => void onDelete()}
      >
        Hapus budget
      </Button>
      <p className="text-sm text-muted-foreground">
        Berakhir mulai {formatPeriodLabel(period)}. Bulan sebelumnya tetap.
      </p>
    </div>
  );
}
