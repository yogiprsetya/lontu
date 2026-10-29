"use client";

import { useState } from "react";
import { CalendarClockIcon } from "lucide-react";
import { SectionTitle } from "@/components/layout/section-title";
import { RecordOccurrenceModal, SKIP_HINT, skipOccurrence } from "@/components/recurring/occurrence-actions";
import { TypeChip } from "@/components/transactions/type-chip";
import { Button } from "@/components/ui/button";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useRecurring } from "@/hooks/use-recurring";
import { todayInJakarta } from "@/lib/date";
import { formatLateness } from "@/lib/recurring-format";
import type { RecurringRule } from "@/lib/schemas/recurring";

/** Rules due today or earlier, one occurrence each. Renders nothing when none is due. */
export function DueInbox() {
  const { data } = useRecurring();
  const online = useOnlineStatus();
  const money = useAmountFormat();
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [skipping, setSkipping] = useState<string | null>(null);
  const today = todayInJakarta();

  const due = data?.due ?? [];
  // Read from the cache by id, so the modal closes by itself once the rule has moved on.
  const recording = due.find((r) => r.id === recordingId);
  if (due.length === 0) return null;

  async function skip(rule: RecurringRule) {
    setSkipping(rule.id);
    await skipOccurrence(rule);
    setSkipping(null);
  }

  return (
    <section aria-labelledby="due-inbox-title" className="surface flex flex-col gap-3 px-5 py-5">
      <SectionTitle id="due-inbox-title" icon={CalendarClockIcon} tone="sky">
        Jatuh tempo
      </SectionTitle>
      <ul className="divide-y">
        {due.map((rule) => (
          <li key={rule.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <TypeChip type={rule.type} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">{rule.name}</p>
                <p className="truncate text-sm text-muted-foreground tabular-nums">
                  {money(rule.amount)} ·{" "}
                  <span className={rule.nextDueDate < today ? "font-bold text-expense" : undefined}>
                    {formatLateness(rule.nextDueDate, today)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="h-11 flex-1 text-base sm:flex-none" disabled={!online} onClick={() => setRecordingId(rule.id)}>
                Catat
              </Button>
              <Button
                variant="outline"
                className="h-11 flex-1 text-base sm:flex-none"
                disabled={!online || skipping === rule.id}
                onClick={() => void skip(rule)}
              >
                Lewati
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground">{online ? SKIP_HINT : "Butuh koneksi untuk mencatat atau melewati."}</p>
      <RecordOccurrenceModal rule={recording} onClose={() => setRecordingId(null)} />
    </section>
  );
}
