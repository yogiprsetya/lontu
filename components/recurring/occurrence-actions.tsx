"use client";

import { lazy, Suspense } from "react";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { Skeleton } from "@/components/ui/skeleton";
import type { RecurringRule } from "@/lib/schemas/recurring";

// Loaded on the first Catat: the form and its pickers would otherwise ship with the dashboard.
const RecordOccurrenceForm = lazy(() =>
  import("@/components/forms/transaction-form").then((m) => ({
    default: m.RecordOccurrenceForm,
  })),
);

/** Catat: the transaction form for the rule's next occurrence, in a modal. */
export function RecordOccurrenceModal({
  rule,
  onClose,
}: {
  rule: RecurringRule | undefined;
  onClose: () => void;
}) {
  return (
    <ResponsiveModal
      open={!!rule}
      onOpenChange={(open) => !open && onClose()}
      title={rule ? `Catat ${rule.name}` : "Catat"}
    >
      {rule && (
        <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
          <RecordOccurrenceForm
            key={`${rule.id}-${rule.nextDueDate}`}
            rule={rule}
            occurrenceDate={rule.nextDueDate}
            onDone={onClose}
          />
        </Suspense>
      )}
    </ResponsiveModal>
  );
}
