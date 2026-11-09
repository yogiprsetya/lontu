"use client";

import { useMemo } from "react";
import { KIND_LABELS } from "@/components/forms/category-labels";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { RestoreButton } from "@/components/modals/archive-controls";
import { RestoreNetWorthButton } from "@/components/net-worth/restore-net-worth";
import { RuleRow } from "@/components/recurring/rule-row";
import { LoadError } from "@/components/settings/load-error";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { restoreAccount, useAccounts } from "@/hooks/use-accounts";
import { type AmountFormat, useAmountFormat } from "@/hooks/use-amount-format";
import { restoreCategory, useCategories } from "@/hooks/use-categories";
import { useNetWorths } from "@/hooks/use-net-worth";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { restoreRule, useRecurring } from "@/hooks/use-recurring";
import { archivedItems } from "@/lib/archived";
import { todayInJakarta } from "@/lib/date";
import { formatRuleAccounts } from "@/lib/recurring-format";
import { ACCOUNT_SUBTYPE_LABELS, type Account } from "@/lib/schemas/account";
import { nameMap } from "@/lib/transaction-format";

export function ArchivedItems({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="Arsip"
      description="Akun, kategori, aturan berulang, dan target yang sudah diarsipkan."
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

type ArchivedRowProps = {
  name: string;
  detail: string;
  /** The Pulihkan button. */
  children: React.ReactNode;
};

function ArchivedRow({ name, detail, children }: ArchivedRowProps) {
  return (
    <li className="flex min-h-16 items-center gap-3 py-3">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-bold">{name}</span>
        <span className="text-sm text-muted-foreground tabular-nums">{detail}</span>
        <span className="text-sm text-muted-foreground">Diarsipkan</span>
      </span>
      {children}
    </li>
  );
}

function accountDetail(account: Account, money: AmountFormat) {
  const balance = money(account.balance);
  return account.subtype ? `${ACCOUNT_SUBTYPE_LABELS[account.subtype]} · ${balance}` : balance;
}

function ArchivedList() {
  const online = useOnlineStatus();
  const money = useAmountFormat();
  const recurring = useRecurring({ includeArchived: true });
  const netWorths = useNetWorths({ includeArchived: true });
  const accounts = useAccounts({ includeArchived: true });
  const categories = useCategories({ includeArchived: true });
  const accountNames = useMemo(() => nameMap(accounts.data), [accounts.data]);
  const today = todayInJakarta();

  const sources = [recurring, netWorths, accounts, categories];
  if (sources.some((source) => source.error)) {
    return (
      <LoadError
        message="Gagal memuat arsip."
        onRetry={() => sources.forEach((source) => void source.mutate())}
      />
    );
  }

  if (!recurring.data || !netWorths.data || !accounts.data || !categories.data) {
    return (
      <div className="flex flex-col gap-2 pb-2" aria-busy="true" aria-label="Memuat arsip">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  const archivedAccounts = archivedItems(accounts.data);
  const archivedCategories = archivedItems(categories.data);
  const archivedRules = archivedItems(recurring.data.rules);
  const archivedTargets = archivedItems(netWorths.data);
  const lists = [archivedAccounts, archivedCategories, archivedRules, archivedTargets];

  if (lists.every((list) => list.length === 0)) {
    return <p className="py-6 text-center text-muted-foreground">Belum ada yang diarsipkan.</p>;
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      {!online && <p className="text-sm text-muted-foreground">Butuh koneksi untuk memulihkan.</p>}
      {archivedAccounts.length > 0 && (
        <ArchivedSection title="Akun">
          {archivedAccounts.map((account) => (
            <ArchivedRow
              key={account.id}
              name={account.name}
              detail={accountDetail(account, money)}
            >
              <RestoreButton
                name={account.name}
                restore={() => restoreAccount(account.id)}
                disabled={!online}
              />
            </ArchivedRow>
          ))}
        </ArchivedSection>
      )}
      {archivedCategories.length > 0 && (
        <ArchivedSection title="Kategori">
          {archivedCategories.map((category) => (
            <ArchivedRow key={category.id} name={category.name} detail={KIND_LABELS[category.kind]}>
              <RestoreButton
                name={category.name}
                restore={() => restoreCategory(category.id)}
                disabled={!online}
              />
            </ArchivedRow>
          ))}
        </ArchivedSection>
      )}
      {archivedRules.length > 0 && (
        <ArchivedSection title="Aturan berulang">
          {archivedRules.map((rule) => (
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
      {archivedTargets.length > 0 && (
        <ArchivedSection title="Target">
          {archivedTargets.map((target) => (
            <ArchivedRow
              key={target.id}
              name={target.name}
              detail={`Target ${money(target.targetAmount)}`}
            >
              <RestoreNetWorthButton netWorth={target} disabled={!online} />
            </ArchivedRow>
          ))}
        </ArchivedSection>
      )}
    </div>
  );
}
