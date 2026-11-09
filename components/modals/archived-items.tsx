"use client";

import { useMemo } from "react";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { RestoreButton } from "@/components/modals/archive-controls";
import { RestoreNetWorthButton } from "@/components/net-worth/restore-net-worth";
import { RuleRow } from "@/components/recurring/rule-row";
import { LoadError } from "@/components/settings/load-error";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { useNetWorths } from "@/hooks/use-net-worth";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { restoreRule, useRecurring } from "@/hooks/use-recurring";
import { archivedItems } from "@/lib/archived";
import { todayInJakarta } from "@/lib/date";
import { formatRuleAccounts } from "@/lib/recurring-format";
import type { NetWorthProgress } from "@/lib/schemas/net-worth";
import { nameMap } from "@/lib/transaction-format";

export function ArchivedItems({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Arsip"
      description="Aturan berulang dan target yang sudah diarsipkan."
    >
      <ScrollArea className="w-full lg:h-64 pr-2">
        <ArchivedList />
      </ScrollArea>
    </ResponsiveModal>
  );
}

function ArchivedSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-1">
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h3>
      <ul className="flex flex-col divide-y">{children}</ul>
    </section>
  );
}

function ArchivedTargetRow({ target, online }: { target: NetWorthProgress; online: boolean }) {
  const money = useAmountFormat();
  return (
    <li className="flex min-h-16 items-center gap-3 py-3">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-bold">{target.name}</span>
        <span className="text-sm text-muted-foreground tabular-nums">
          Target {money(target.targetAmount)}
        </span>
        <span className="text-sm text-muted-foreground">Diarsipkan</span>
      </span>
      <RestoreNetWorthButton netWorth={target} disabled={!online} />
    </li>
  );
}

function ArchivedList() {
  const online = useOnlineStatus();
  const recurring = useRecurring({ includeArchived: true });
  const netWorths = useNetWorths({ includeArchived: true });
  const accounts = useAccounts({ includeArchived: true });
  const accountNames = useMemo(() => nameMap(accounts.data), [accounts.data]);
  const today = todayInJakarta();

  if (recurring.error || netWorths.error || accounts.error) {
    return (
      <LoadError
        message="Gagal memuat arsip."
        onRetry={() => {
          void recurring.mutate();
          void netWorths.mutate();
          void accounts.mutate();
        }}
      />
    );
  }

  if (!recurring.data || !netWorths.data || !accounts.data) {
    return (
      <div className="flex flex-col gap-2 pb-2" aria-busy="true" aria-label="Memuat arsip">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  const rules = archivedItems(recurring.data.rules);
  const targets = archivedItems(netWorths.data);

  if (rules.length === 0 && targets.length === 0) {
    return <p className="py-6 text-center text-muted-foreground">Belum ada yang diarsipkan.</p>;
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      {!online && <p className="text-sm text-muted-foreground">Butuh koneksi untuk memulihkan.</p>}
      {rules.length > 0 && (
        <ArchivedSection title="Aturan berulang">
          {rules.map((rule) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              accountLabel={formatRuleAccounts(rule, accountNames)}
              today={today}
            >
              <RestoreButton
                name={rule.name}
                restore={() => restoreRule(rule.id)}
                disabled={!online}
              />
            </RuleRow>
          ))}
        </ArchivedSection>
      )}
      {targets.length > 0 && (
        <ArchivedSection title="Target">
          {targets.map((target) => (
            <ArchivedTargetRow key={target.id} target={target} online={online} />
          ))}
        </ArchivedSection>
      )}
    </div>
  );
}
