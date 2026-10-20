"use client";

import { useState } from "react";
import { ArchiveIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { AccountForm } from "@/components/forms/account-form";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { LoadError } from "@/components/settings/load-error";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { archiveAccount, restoreAccount, useAccounts } from "@/hooks/use-accounts";
import { formatIDR } from "@/lib/money";
import { ACCOUNT_SUBTYPE_LABELS, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES, type Account } from "@/lib/schemas/account";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";

type View = { kind: "list" } | { kind: "create" } | { kind: "edit"; account: Account };

const titles = { list: "Kelola akun", create: "Tambah akun", edit: "Ubah akun" };

export function ManageAccounts({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [view, setView] = useState<View>({ kind: "list" });
  const [showArchived, setShowArchived] = useState(false);
  const toList = () => setView({ kind: "list" });

  function handleOpenChange(next: boolean) {
    if (next) return;
    onClose();
    toList();
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleOpenChange}
      title={titles[view.kind]}
      description={view.kind === "list" ? "Rekening, e-wallet, kartu kredit, dan aset." : undefined}
      footer={
        view.kind === "list" ? (
          <Button className="h-11 text-base" onClick={() => setView({ kind: "create" })}>
            <PlusIcon aria-hidden />
            Tambah akun
          </Button>
        ) : undefined
      }
    >
      <div className="lg:max-h-[60vh] lg:overflow-y-auto">
        {view.kind === "list" && (
          <AccountList
            showArchived={showArchived}
            onShowArchivedChange={setShowArchived}
            onEdit={(account) => setView({ kind: "edit", account })}
          />
        )}
        {view.kind === "create" && <AccountForm onDone={toList} onCancel={toList} />}
        {view.kind === "edit" && (
          <AccountForm key={view.account.id} account={view.account} onDone={toList} onCancel={toList}>
            <ArchiveAccountButton account={view.account} onArchived={toList} />
          </AccountForm>
        )}
      </div>
    </ResponsiveModal>
  );
}

type AccountListProps = {
  showArchived: boolean;
  onShowArchivedChange: (show: boolean) => void;
  onEdit: (account: Account) => void;
};

function AccountList({ showArchived, onShowArchivedChange, onEdit }: AccountListProps) {
  const { data, error, mutate } = useAccounts({ includeArchived: showArchived });

  return (
    <div className="flex flex-col gap-4 pb-2">
      <Label
        htmlFor="show-archived-accounts"
        className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-base font-normal"
      >
        Tampilkan arsip
        <Switch id="show-archived-accounts" checked={showArchived} onCheckedChange={onShowArchivedChange} />
      </Label>
      {error ? (
        <LoadError onRetry={() => void mutate()} message="Gagal memuat akun." />
      ) : !data ? (
        <div className="flex flex-col gap-2" aria-busy="true" aria-label="Memuat akun">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">
          Belum ada akun. Tambahkan rekening atau e-wallet pertamamu.
        </p>
      ) : (
        ACCOUNT_TYPES.map((type) => {
          const accounts = data.filter((a) => a.type === type);
          if (accounts.length === 0) return null;
          return (
            <section key={type} aria-label={ACCOUNT_TYPE_LABELS[type]} className="flex flex-col gap-1">
              <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {ACCOUNT_TYPE_LABELS[type]}
              </h3>
              <ul className="flex flex-col">
                {accounts.map((account) => (
                  <li key={account.id}>
                    {account.archivedAt ? (
                      <ArchivedAccountRow account={account} />
                    ) : (
                      <button
                        type="button"
                        onClick={() => onEdit(account)}
                        className="-mx-2 w-[calc(100%+1rem)] rounded-md px-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <AccountSummary account={account} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function AccountSummary({ account }: { account: Account }) {
  const hideAmounts = useUIStore((s) => s.hideAmounts);

  return (
    <div className="flex min-h-14 flex-1 items-center gap-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base">{account.name}</span>
        {account.subtype && (
          <span className="text-sm text-muted-foreground">{ACCOUNT_SUBTYPE_LABELS[account.subtype]}</span>
        )}
      </div>
      <span
        data-slot="account-balance"
        className={cn("shrink-0 text-base font-medium", account.balance < 0 && "text-destructive")}
      >
        {hideAmounts ? "Rp•••••" : formatIDR(account.balance)}
      </span>
    </div>
  );
}

function ArchivedAccountRow({ account }: { account: Account }) {
  const [pending, setPending] = useState(false);

  async function restore() {
    setPending(true);
    try {
      await restoreAccount(account.id);
      toast.success(`${account.name} dipulihkan`);
    } catch {
      toast.error("Gagal memulihkan akun. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1 opacity-60">
        <AccountSummary account={account} />
      </div>
      <Button variant="outline" className="h-11 shrink-0 text-base" disabled={pending} onClick={() => void restore()}>
        Pulihkan
      </Button>
    </div>
  );
}

function ArchiveAccountButton({ account, onArchived }: { account: Account; onArchived: () => void }) {
  const [pending, setPending] = useState(false);

  async function archive() {
    setPending(true);
    try {
      await archiveAccount(account.id);
      toast.success(`${account.name} diarsipkan`);
      onArchived();
    } catch {
      toast.error("Gagal mengarsipkan akun. Coba lagi.");
      setPending(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button type="button" variant="destructive" className="h-11 self-start text-base" />}>
        <ArchiveIcon aria-hidden />
        Arsipkan akun
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Arsipkan {account.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {account.balance !== 0 && <>Saldo saat ini {formatIDR(account.balance)}. </>}
            Akun disembunyikan dari daftar dan pilihan, tetapi tetap tercatat di transaksi lama. Kamu bisa
            memulihkannya kapan saja.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 text-base">Batal</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            className="h-11 text-base"
            disabled={pending}
            onClick={() => void archive()}
          >
            Arsipkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
