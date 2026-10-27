"use client";

import { lazy, Suspense } from "react";
import { toast } from "sonner";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { Skeleton } from "@/components/ui/skeleton";
import { advanceRule, revalidateRecurring } from "@/hooks/use-recurring";
import { ApiError } from "@/lib/fetcher";
import { failureMessage } from "@/lib/offline/network-error";
import type { RecurringRule } from "@/lib/schemas/recurring";

// Loaded on the first Catat: the form and its pickers would otherwise ship with the dashboard.
const TransactionForm = lazy(() => import("@/components/forms/transaction-form").then((m) => ({ default: m.TransactionForm })));

export const SKIP_HINT = "Lewati: sudah dicatat manual atau tidak terjadi bulan ini.";

/** Lewati the rule's next occurrence. No undo (spec Open question #4). */
export async function skipOccurrence(rule: RecurringRule) {
  try {
    await advanceRule(rule.id, { action: "skip", occurrenceDate: rule.nextDueDate });
    toast(`${rule.name} dilewati`);
  } catch (err) {
    if (err instanceof ApiError && err.code === "OCCURRENCE_STALE") {
      toast("Kejadian ini sudah ditangani");
      void revalidateRecurring();
      return;
    }
    toast.error(failureMessage(err, "Gagal melewati. Coba lagi."));
  }
}

/** Catat: the transaction form for the rule's next occurrence, in a modal. */
export function RecordOccurrenceModal({ rule, onClose }: { rule: RecurringRule | undefined; onClose: () => void }) {
  return (
    <ResponsiveModal open={!!rule} onOpenChange={(open) => !open && onClose()} title={rule ? `Catat ${rule.name}` : "Catat"}>
      {rule && (
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
          <TransactionForm
            key={`${rule.id}-${rule.nextDueDate}`}
            type={rule.type}
            recurring={{ rule, occurrenceDate: rule.nextDueDate, onDone: onClose }}
          />
        </Suspense>
      )}
    </ResponsiveModal>
  );
}
