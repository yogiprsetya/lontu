"use client";

import { useState } from "react";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { AccountForm } from "@/components/forms/account-form";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import {
  ArchiveButton,
  RestoreButton,
  ShowArchivedSwitch,
} from "@/components/modals/archive-controls";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  archiveAccount,
  restoreAccount,
  useAccounts,
} from "@/hooks/use-accounts";
import { formatIDR } from "@/lib/money";
import {
  ACCOUNT_SUBTYPE_LABELS,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPES,
  type Account,
} from "@/lib/schemas/account";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";
import { ScrollArea } from "../ui/scroll-area";

type View =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; account: Account };

const titles = {
  list: "Kelola akun",
  create: "Tambah akun",
  edit: "Ubah akun",
};

export function ManageAccounts({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
      description={
        view.kind === "list"
          ? "Rekening, e-wallet, kartu kredit, dan aset."
          : undefined
      }
      footer={
        view.kind === "list" ? (
          <Button
            className="h-11 text-base"
            onClick={() => setView({ kind: "create" })}
          >
            <PlusIcon aria-hidden />
            Tambah akun
          </Button>
        ) : undefined
      }
    >
      <ScrollArea className="w-full lg:h-56">
        {view.kind === "list" && (
          <AccountList
            showArchived={showArchived}
            onShowArchivedChange={setShowArchived}
            onEdit={(account) => setView({ kind: "edit", account })}
          />
        )}
        {view.kind === "create" && (
          <AccountForm onDone={toList} onCancel={toList} />
        )}
        {view.kind === "edit" && (
          <AccountForm
            key={view.account.id}
            account={view.account}
            onDone={toList}
            onCancel={toList}
          >
            <ArchiveButton
              label="Arsipkan akun"
              name={view.account.name}
              description={
                <>
                  {view.account.balance !== 0 && (
                    <>Saldo saat ini {formatIDR(view.account.balance)}. </>
                  )}
                  Akun disembunyikan dari daftar dan pilihan, tetapi tetap
                  tercatat di transaksi lama. Kamu bisa memulihkannya kapan
                  saja.
                </>
              }
              archive={() => archiveAccount(view.account.id)}
              onArchived={toList}
            />
          </AccountForm>
        )}
      </ScrollArea>
    </ResponsiveModal>
  );
}

type AccountListProps = {
  showArchived: boolean;
  onShowArchivedChange: (show: boolean) => void;
  onEdit: (account: Account) => void;
};

function AccountList({
  showArchived,
  onShowArchivedChange,
  onEdit,
}: AccountListProps) {
  const { data, error, mutate } = useAccounts({
    includeArchived: showArchived,
  });

  return (
    <div className="flex flex-col gap-4 pb-2">
      <ShowArchivedSwitch
        id="show-archived-accounts"
        checked={showArchived}
        onCheckedChange={onShowArchivedChange}
      />
      {error ? (
        <LoadError onRetry={() => void mutate()} message="Gagal memuat akun." />
      ) : !data ? (
        <div
          className="flex flex-col gap-2"
          aria-busy="true"
          aria-label="Memuat akun"
        >
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
            <section
              key={type}
              aria-label={ACCOUNT_TYPE_LABELS[type]}
              className="flex flex-col gap-1"
            >
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
                        className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-md px-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <AccountSummary account={account} />
                        <ChevronRightIcon
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
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
  const meta = [
    account.subtype && ACCOUNT_SUBTYPE_LABELS[account.subtype],
    account.archivedAt && "Diarsipkan",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base">{account.name}</span>
        {meta && <span className="text-sm text-muted-foreground">{meta}</span>}
      </div>
      <span
        data-slot="account-balance"
        className={cn(
          "shrink-0 text-base font-medium",
          account.balance < 0 && "text-destructive",
        )}
      >
        {hideAmounts ? "Rp•••••" : formatIDR(account.balance)}
      </span>
    </div>
  );
}

function ArchivedAccountRow({ account }: { account: Account }) {
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1 text-muted-foreground">
        <AccountSummary account={account} />
      </div>
      <RestoreButton
        name={account.name}
        restore={() => restoreAccount(account.id)}
      />
    </div>
  );
}
