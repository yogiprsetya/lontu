import { toast } from "sonner";
import { advanceRule, revalidateRecurring } from "@/hooks/use-recurring";
import { ApiError } from "@/lib/fetcher";
import { failureMessage } from "@/lib/offline/network-error";
import type { RecurringRule } from "@/lib/schemas/recurring";

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
