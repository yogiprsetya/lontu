"use client";

import { lazy, Suspense, useMemo, useState } from "react";
import { EllipsisVerticalIcon, PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { AssetHistory } from "@/components/net-worth/asset-history";
import { AssetValues, NoAssets } from "@/components/net-worth/asset-values";
import { NetWorthCard } from "@/components/net-worth/net-worth-card";
import { ValuationSheet } from "@/components/net-worth/valuation-sheet";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { ShowArchivedSwitch } from "@/components/modals/archive-controls";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { archiveNetWorth, restoreNetWorth, useNetWorths } from "@/hooks/use-net-worth";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useValuations } from "@/hooks/use-valuations";
import { todayInJakarta } from "@/lib/date";
import { ApiError } from "@/lib/fetcher";
import { failureMessage } from "@/lib/offline/network-error";
import type { Account } from "@/lib/schemas/account";
import type { NetWorthProgress } from "@/lib/schemas/net-worth";
import type { AssetValuation } from "@/lib/schemas/valuation";
import { undoToast } from "@/lib/undo-toast";

// Loaded on the first Tambah target or Ubah, not with the page.
const NetWorthForm = lazy(() =>
  import("@/components/forms/net-worth-form").then((m) => ({ default: m.NetWorthForm })),
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

/** A 409 names the net worth or account that is now taken, so its message is shown as is. */
async function restoreWithMessage(netWorth: NetWorthProgress) {
  try {
    await restoreNetWorth(netWorth.id);
    toast.success(`${netWorth.name} dipulihkan`);
  } catch (err) {
    toast.error(
      err instanceof ApiError && err.status === 409
        ? err.message
        : failureMessage(err, "Gagal memulihkan target. Coba lagi."),
    );
  }
}

function RestoreNetWorthButton({
  netWorth,
  online,
}: {
  netWorth: NetWorthProgress;
  online: boolean;
}) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      className="h-11 text-base"
      disabled={!online || pending}
      onClick={async () => {
        setPending(true);
        await restoreWithMessage(netWorth);
        setPending(false);
      }}
    >
      Pulihkan
    </Button>
  );
}

function NetWorthMenu({
  netWorth,
  online,
  onEdit,
  onArchive,
}: {
  netWorth: NetWorthProgress;
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
        aria-label={`Ubah ${netWorth.name}`}
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
              aria-label={`Aksi untuk ${netWorth.name}`}
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

function NoNetWorths({ showArchived, onCreate }: { showArchived: boolean; onCreate: () => void }) {
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

type NetWorthListProps = {
  netWorths: NetWorthProgress[];
  accounts: Map<string, Account>;
  assets: AssetValuation[];
  today: string;
  online: boolean;
  onValue?: (accountId: string) => void;
  onEdit: (id: string) => void;
  onArchive: (netWorth: NetWorthProgress) => void;
};

function NetWorthList({
  netWorths,
  accounts,
  assets,
  today,
  online,
  onValue,
  onEdit,
  onArchive,
}: NetWorthListProps) {
  const lastValuedAt = new Map(assets.map((a) => [a.accountId, a.lastValuedAt]));
  return (
    <section aria-labelledby="net-worth-list" className="flex flex-col gap-3">
      <h2
        id="net-worth-list"
        className="px-1 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase"
      >
        Target
      </h2>
      {netWorths.map((netWorth) => (
        <NetWorthCard
          key={netWorth.id}
          netWorth={netWorth}
          accounts={accounts}
          lastValuedAt={lastValuedAt}
          today={today}
          onValue={netWorth.archivedAt ? undefined : onValue}
        >
          {netWorth.archivedAt ? (
            <RestoreNetWorthButton netWorth={netWorth} online={online} />
          ) : (
            <NetWorthMenu
              netWorth={netWorth}
              online={online}
              onEdit={() => onEdit(netWorth.id)}
              onArchive={() => onArchive(netWorth)}
            />
          )}
        </NetWorthCard>
      ))}
    </section>
  );
}

export function NetWorthView() {
  const [valuingId, setValuingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  // Archived net worths vanish at once; the id leaves this set when the request settles.
  const [archiving, setArchiving] = useState<ReadonlySet<string>>(new Set());
  const online = useOnlineStatus();
  const netWorths = useNetWorths({ includeArchived: showArchived });
  const valuations = useValuations();
  const accounts = useAccounts({ includeArchived: true });
  const accountsById = useMemo(
    () => new Map(accounts.data?.map((a) => [a.id, a])),
    [accounts.data],
  );
  const today = todayInJakarta();
  const assets = valuations.data;
  const valuing = assets?.find((a) => a.accountId === valuingId);
  const visibleNetWorths = netWorths.data?.filter((g) => !archiving.has(g.id));
  const editing = visibleNetWorths?.find((g) => g.id === editingId && !g.archivedAt);
  const formOpen = creating || !!editing;
  const closeForm = () => {
    setCreating(false);
    setEditingId(null);
  };

  async function archive(netWorth: NetWorthProgress) {
    setArchiving((prev) => new Set(prev).add(netWorth.id));
    try {
      await archiveNetWorth(netWorth.id);
      undoToast({ message: "Target diarsipkan", restore: () => restoreWithMessage(netWorth) });
    } catch (err) {
      toast.error(failureMessage(err, "Gagal mengarsipkan target. Coba lagi."));
    } finally {
      setArchiving((prev) => {
        const next = new Set(prev);
        next.delete(netWorth.id);
        return next;
      });
    }
  }

  const error = netWorths.error ?? valuations.error ?? accounts.error;
  let content;
  if (error) {
    content = (
      <LoadError
        message="Gagal memuat target dan nilai aset."
        onRetry={() => {
          void netWorths.mutate();
          void valuations.mutate();
          void accounts.mutate();
        }}
      />
    );
  } else if (!visibleNetWorths || !assets || !accounts.data) {
    content = <ViewSkeleton />;
  } else {
    content = (
      <>
        {visibleNetWorths.length === 0 ? (
          <NoNetWorths showArchived={showArchived} onCreate={() => setCreating(true)} />
        ) : (
          <NetWorthList
            netWorths={visibleNetWorths}
            accounts={accountsById}
            assets={assets}
            today={today}
            online={online}
            onValue={online ? setValuingId : undefined}
            onEdit={setEditingId}
            onArchive={(netWorth) => void archive(netWorth)}
          />
        )}
        {assets.length === 0 ? (
          <NoAssets />
        ) : (
          <>
            <AssetValues
              assets={assets}
              accounts={accountsById}
              today={today}
              online={online}
              onValue={setValuingId}
            />
            <AssetHistory assets={assets} accounts={accountsById} />
          </>
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
        </div>
        <ShowArchivedSwitch
          id="show-archived-net-worth"
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
                form="net-worth-form"
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
            <NetWorthForm key={editing?.id ?? "create"} netWorth={editing} onDone={closeForm} />
          </Suspense>
        )}
      </ResponsiveModal>
      <ValuationSheet
        asset={valuing}
        account={valuing && accountsById.get(valuing.accountId)}
        onClose={() => setValuingId(null)}
      />
    </>
  );
}
