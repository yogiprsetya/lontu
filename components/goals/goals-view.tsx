"use client";

import { lazy, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { PlusIcon, RefreshCwIcon, TrendingUpIcon } from "lucide-react";
import { GoalCard } from "@/components/goals/goal-card";
import { ValuationSheet } from "@/components/goals/valuation-sheet";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { SectionTitle } from "@/components/layout/section-title";
import { LoadError } from "@/components/settings/load-error";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { useGoals } from "@/hooks/use-goals";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useValuations } from "@/hooks/use-valuations";
import { archiveLabel } from "@/lib/archived";
import { todayInJakarta } from "@/lib/date";
import { ACCOUNT_SUBTYPE_LABELS, type Account } from "@/lib/schemas/account";
import type { GoalProgress } from "@/lib/schemas/goal";
import type { AssetValuation } from "@/lib/schemas/valuation";
import { cn } from "@/lib/utils";
import { formatMarketGain, isStale, valuedLabel } from "@/lib/valuation-format";

// Loaded on the first Tambah target, not with the page.
const GoalForm = lazy(() =>
  import("@/components/forms/goal-form").then((m) => ({ default: m.GoalForm })),
);

function ViewSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Memuat nilai aset">
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function NoGoals({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center">
      <p className="text-muted-foreground">
        Buat target seperti DP rumah atau dana darurat, lalu pilih akun yang menabung untuknya.
      </p>
      <Button className="h-11 text-base" onClick={onCreate}>
        Tambah target
      </Button>
    </div>
  );
}

type GoalListProps = {
  goals: GoalProgress[];
  accounts: Map<string, Account>;
  assets: AssetValuation[];
  today: string;
  onValue?: () => void;
};

function GoalList({ goals, accounts, assets, today, onValue }: GoalListProps) {
  const lastValuedAt = new Map(assets.map((a) => [a.accountId, a.lastValuedAt]));
  return (
    <section aria-labelledby="goal-list" className="flex flex-col gap-3">
      <h2
        id="goal-list"
        className="px-1 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase"
      >
        Target
      </h2>
      {goals.map((goal) => (
        <GoalCard
          key={goal.id}
          goal={goal}
          accounts={accounts}
          lastValuedAt={lastValuedAt}
          today={today}
          onValue={onValue}
        />
      ))}
    </section>
  );
}

function NoAssets() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center">
      <p className="text-muted-foreground">
        Belum ada akun aset. Buat akun aset untuk reksadana atau emas di Settings, lalu perbarui
        nilainya di sini tiap bulan.
      </p>
      <Link href="/settings" className={cn(buttonVariants(), "h-11 text-base")}>
        Buka Settings
      </Link>
    </div>
  );
}

function AssetRow({
  asset,
  account,
  today,
}: {
  asset: AssetValuation;
  account: Account | undefined;
  today: string;
}) {
  const money = useAmountFormat();
  const stale = isStale(asset.lastValuedAt, today);
  const subtype = account?.subtype ? ACCOUNT_SUBTYPE_LABELS[account.subtype] : "Aset";
  return (
    <li className="flex min-h-16 flex-col gap-1 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 truncate font-bold">{account ? archiveLabel(account) : "Akun"}</p>
        <p className="shrink-0 font-heading text-lg font-extrabold">{money(asset.balance)}</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Disetor {money(asset.contributed)} · Pasar {money(asset.marketGain, formatMarketGain)}
      </p>
      <p className={cn("text-sm", stale ? "font-semibold text-expense" : "text-muted-foreground")}>
        {subtype} · {valuedLabel(asset.lastValuedAt, today)}
      </p>
    </li>
  );
}

function AssetValues({
  assets,
  accounts,
  today,
}: {
  assets: AssetValuation[];
  accounts: Map<string, Account>;
  today: string;
}) {
  return (
    <section aria-labelledby="asset-values" className="flex flex-col gap-3 surface px-5 py-5">
      <SectionTitle id="asset-values" icon={TrendingUpIcon} tone="mint">
        Nilai aset
      </SectionTitle>
      <ul className="divide-y">
        {assets.map((asset) => (
          <AssetRow
            key={asset.accountId}
            asset={asset}
            account={accounts.get(asset.accountId)}
            today={today}
          />
        ))}
      </ul>
    </section>
  );
}

export function GoalsView() {
  const [valuing, setValuing] = useState(false);
  const [creating, setCreating] = useState(false);
  const online = useOnlineStatus();
  const goals = useGoals();
  const valuations = useValuations();
  const accounts = useAccounts({ includeArchived: true });
  const accountsById = useMemo(
    () => new Map(accounts.data?.map((a) => [a.id, a])),
    [accounts.data],
  );
  const today = todayInJakarta();
  const assets = valuations.data;
  const canValue = online && !!assets?.length;
  const closeForm = () => setCreating(false);

  const error = goals.error ?? valuations.error ?? accounts.error;
  let content;
  if (error) {
    content = (
      <LoadError
        message="Gagal memuat target dan nilai aset."
        onRetry={() => {
          void goals.mutate();
          void valuations.mutate();
          void accounts.mutate();
        }}
      />
    );
  } else if (!goals.data || !assets || !accounts.data) {
    content = <ViewSkeleton />;
  } else {
    content = (
      <>
        {goals.data.length === 0 ? (
          <NoGoals onCreate={() => setCreating(true)} />
        ) : (
          <GoalList
            goals={goals.data}
            accounts={accountsById}
            assets={assets}
            today={today}
            onValue={canValue ? () => setValuing(true) : undefined}
          />
        )}
        {assets.length === 0 ? (
          <NoAssets />
        ) : (
          <AssetValues assets={assets} accounts={accountsById} today={today} />
        )}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button className="h-11 text-base" onClick={() => setCreating(true)}>
            <PlusIcon aria-hidden />
            Tambah target
          </Button>
          <Button
            variant="outline"
            className="h-11 text-base"
            disabled={!canValue}
            onClick={() => setValuing(true)}
          >
            <RefreshCwIcon aria-hidden />
            Perbarui nilai
          </Button>
        </div>
        {!online && (
          <p className="text-sm text-muted-foreground">
            Butuh koneksi untuk menyimpan target atau memperbarui nilai.
          </p>
        )}
      </div>
      {content}
      <ResponsiveModal
        open={creating}
        onOpenChange={(open) => !open && closeForm()}
        title="Tambah target"
        footer={
          <div className="flex flex-col gap-2">
            {!online && (
              <p className="text-center text-sm text-muted-foreground">
                Butuh koneksi untuk menyimpan.
              </p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11 flex-1 text-base"
                onClick={closeForm}
              >
                Batal
              </Button>
              <Button
                type="submit"
                form="goal-form"
                className="h-11 flex-1 text-base"
                disabled={!online}
              >
                Simpan
              </Button>
            </div>
          </div>
        }
      >
        {creating && (
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
            <GoalForm onDone={closeForm} />
          </Suspense>
        )}
      </ResponsiveModal>
      <ValuationSheet
        open={valuing}
        onClose={() => setValuing(false)}
        assets={assets ?? []}
        accounts={accountsById}
      />
    </>
  );
}
