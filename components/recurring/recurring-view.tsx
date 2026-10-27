"use client";

import { useMemo, useState } from "react";
import { ShowArchivedSwitch } from "@/components/modals/archive-controls";
import { RuleRow } from "@/components/recurring/rule-row";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { useRecurring } from "@/hooks/use-recurring";
import { todayInJakarta } from "@/lib/date";
import { RECURRING_GROUPS } from "@/lib/recurring-format";
import { nameMap } from "@/lib/transaction-format";
import { useUIStore } from "@/stores/ui";

function ViewSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat aturan">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function RecurringView() {
  const [showArchived, setShowArchived] = useState(false);
  const hideAmounts = useUIStore((s) => s.hideAmounts);
  const recurring = useRecurring({ includeArchived: showArchived });
  const accounts = useAccounts({ includeArchived: true });
  const accountNames = useMemo(() => nameMap(accounts.data), [accounts.data]);
  const today = todayInJakarta();

  const error = recurring.error ?? accounts.error;
  let content;
  if (error) {
    content = (
      <LoadError
        message="Gagal memuat aturan berulang."
        onRetry={() => {
          void recurring.mutate();
          void accounts.mutate();
        }}
      />
    );
  } else if (!recurring.data || !accounts.data) {
    content = <ViewSkeleton />;
  } else if (recurring.data.rules.length === 0) {
    content = (
      <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center">
        <p className="text-muted-foreground">
          {showArchived
            ? "Belum ada aturan, termasuk arsip."
            : "Daftarkan gaji dan tagihan tetap supaya kamu tahu berapa yang bebas dipakai sampai gajian."}
        </p>
        {!showArchived && (
          <div className="flex flex-wrap justify-center gap-2">
            <Button className="h-11 text-base" disabled>
              Tambah gaji
            </Button>
            <Button variant="outline" className="h-11 text-base" disabled>
              Tambah tagihan
            </Button>
          </div>
        )}
      </div>
    );
  } else {
    const rules = recurring.data.rules;
    content = RECURRING_GROUPS.map(({ type, label }) => {
      const rows = rules.filter((r) => r.type === type);
      if (rows.length === 0) return null;
      return (
        <section key={type} aria-labelledby={`recurring-${type}`}>
          <h2 id={`recurring-${type}`} className="mb-2 px-1 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
            {label}
          </h2>
          <ul className="surface divide-y px-4">
            {rows.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                accountName={accountNames.get(rule.accountId) ?? "Akun"}
                today={today}
                hideAmounts={hideAmounts}
              />
            ))}
          </ul>
        </section>
      );
    });
  }

  return (
    <>
      <ShowArchivedSwitch id="show-archived-rules" checked={showArchived} onCheckedChange={setShowArchived} />
      {content}
    </>
  );
}
