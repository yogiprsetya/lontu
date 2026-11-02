"use client";

import { lazy, Suspense, useMemo, useState } from "react";
import Link from "next/link";
import {
  EllipsisVerticalIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  TrendingUpIcon,
} from "lucide-react";
import { toast } from "sonner";
import { GoalCard } from "@/components/goals/goal-card";
import { ValuationSheet } from "@/components/goals/valuation-sheet";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { SectionTitle } from "@/components/layout/section-title";
import { ShowArchivedSwitch } from "@/components/modals/archive-controls";
import { LoadError } from "@/components/settings/load-error";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { archiveGoal, restoreGoal, useGoals } from "@/hooks/use-goals";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useValuations } from "@/hooks/use-valuations";
import { archiveLabel } from "@/lib/archived";
import { todayInJakarta } from "@/lib/date";
import { ApiError } from "@/lib/fetcher";
import { failureMessage } from "@/lib/offline/network-error";
import { ACCOUNT_SUBTYPE_LABELS, type Account } from "@/lib/schemas/account";
import type { GoalProgress } from "@/lib/schemas/goal";
import type { AssetValuation } from "@/lib/schemas/valuation";
import { undoToast } from "@/lib/undo-toast";
import { cn } from "@/lib/utils";
import { formatMarketGain, isStale, valuedLabel } from "@/lib/valuation-format";

// Loaded on the first Tambah target or Ubah, not with the page.
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

/** A 409 names the goal or account that is now taken, so its message is shown as is. */
async function restoreWithMessage(goal: GoalProgress) {
  try {
    await restoreGoal(goal.id);
    toast.success(`${goal.name} dipulihkan`);
  } catch (err) {
    toast.error(
      err instanceof ApiError && err.status === 409
        ? err.message
        : failureMessage(err, "Gagal memulihkan target. Coba lagi."),
    );
  }
}

function RestoreGoalButton({ goal, online }: { goal: GoalProgress; online: boolean }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      className="h-11 text-base"
      disabled={!online || pending}
      onClick={async () => {
        setPending(true);
        await restoreWithMessage(goal);
        setPending(false);
      }}
    >
      Pulihkan
    </Button>
  );
}

function GoalMenu({
  goal,
  online,
  onEdit,
  onArchive,
}: {
  goal: GoalProgress;
  online: boolean;
  onEdit: () => void;
  onArchive: () => void;
}) {
  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-11 rounded-xl"
        aria-label={`Ubah ${goal.name}`}
        onClick={onEdit}
      >
        <PencilIcon className="size-5" aria-hidden />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-11 rounded-xl"
              aria-label={`Aksi untuk ${goal.name}`}
            />
          }
        >
          <EllipsisVerticalIcon className="size-5" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44 rounded-2xl p-1.5">
          <DropdownMenuItem
            className="min-h-11 rounded-xl text-base"
            disabled={!online}
            onClick={onArchive}
          >
            Arsipkan{online ? "" : " · Butuh koneksi"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

function NoGoals({ showArchived, onCreate }: { showArchived: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed px-6 py-12 text-center">
      <p className="text-muted-foreground">
        {showArchived
          ? "Belum ada target, termasuk arsip."
          : "Buat target seperti DP rumah atau dana darurat, lalu pilih akun yang menabung untuknya."}
      </p>
      {!showArchived && (
        <Button className="h-11 text-base" onClick={onCreate}>
          Tambah target
        </Button>
      )}
    </div>
  );
}

type GoalListProps = {
  goals: GoalProgress[];
  accounts: Map<string, Account>;
  assets: AssetValuation[];
  today: string;
  online: boolean;
  onValue?: () => void;
  onEdit: (id: string) => void;
  onArchive: (goal: GoalProgress) => void;
};

function GoalList({
  goals,
  accounts,
  assets,
  today,
  online,
  onValue,
  onEdit,
  onArchive,
}: GoalListProps) {
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
          onValue={goal.archivedAt ? undefined : onValue}
        >
          {goal.archivedAt ? (
            <RestoreGoalButton goal={goal} online={online} />
          ) : (
            <GoalMenu
              goal={goal}
              online={online}
              onEdit={() => onEdit(goal.id)}
              onArchive={() => onArchive(goal)}
            />
          )}
        </GoalCard>
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  // Archived goals vanish at once; the id leaves this set when the request settles.
  const [archiving, setArchiving] = useState<ReadonlySet<string>>(new Set());
  const online = useOnlineStatus();
  const goals = useGoals({ includeArchived: showArchived });
  const valuations = useValuations();
  const accounts = useAccounts({ includeArchived: true });
  const accountsById = useMemo(
    () => new Map(accounts.data?.map((a) => [a.id, a])),
    [accounts.data],
  );
  const today = todayInJakarta();
  const assets = valuations.data;
  const canValue = online && !!assets?.length;
  const visibleGoals = goals.data?.filter((g) => !archiving.has(g.id));
  const editing = visibleGoals?.find((g) => g.id === editingId && !g.archivedAt);
  const formOpen = creating || !!editing;
  const closeForm = () => {
    setCreating(false);
    setEditingId(null);
  };

  async function archive(goal: GoalProgress) {
    setArchiving((prev) => new Set(prev).add(goal.id));
    try {
      await archiveGoal(goal.id);
      undoToast({ message: "Target diarsipkan", restore: () => restoreWithMessage(goal) });
    } catch (err) {
      toast.error(failureMessage(err, "Gagal mengarsipkan target. Coba lagi."));
    } finally {
      setArchiving((prev) => {
        const next = new Set(prev);
        next.delete(goal.id);
        return next;
      });
    }
  }

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
  } else if (!visibleGoals || !assets || !accounts.data) {
    content = <ViewSkeleton />;
  } else {
    content = (
      <>
        {visibleGoals.length === 0 ? (
          <NoGoals showArchived={showArchived} onCreate={() => setCreating(true)} />
        ) : (
          <GoalList
            goals={visibleGoals}
            accounts={accountsById}
            assets={assets}
            today={today}
            online={online}
            onValue={canValue ? () => setValuing(true) : undefined}
            onEdit={setEditingId}
            onArchive={(goal) => void archive(goal)}
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
        <ShowArchivedSwitch
          id="show-archived-goals"
          checked={showArchived}
          onCheckedChange={setShowArchived}
        />
        {!online && (
          <p className="text-sm text-muted-foreground">
            Butuh koneksi untuk menyimpan, mengarsipkan, atau memperbarui nilai.
          </p>
        )}
      </div>
      {content}
      <ResponsiveModal
        open={formOpen}
        onOpenChange={(open) => !open && closeForm()}
        title={editing ? "Ubah target" : "Tambah target"}
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
        {formOpen && (
          <Suspense fallback={<Skeleton className="h-96 w-full rounded-2xl" />}>
            <GoalForm key={editing?.id ?? "create"} goal={editing} onDone={closeForm} />
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
