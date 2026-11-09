"use client";

import { useState } from "react";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { AccountForm } from "@/components/forms/account-form";
import { FormActions } from "@/components/layout/form-actions";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { ArchiveButton } from "@/components/modals/archive-controls";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { archiveAccount, useAccounts } from "@/hooks/use-accounts";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { formatIDR } from "@/lib/money";
import {
  ACCOUNT_SUBTYPE_LABELS,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPES,
  type Account,
} from "@/lib/schemas/account";
import { cn } from "@/lib/utils";

type View = { kind: "list" } | { kind: "create" } | { kind: "edit"; account: Account };

const titles = {
  list: "Kelola akun",
  create: "Tambah akun",
  edit: "Ubah akun",
};

export function ManageAccounts({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [view, setView] = useState<View>({ kind: "list" });
  const [saving, setSaving] = useState(false);
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
      dismissible={!saving}
      description={view.kind === "list" ? "Rekening, e-wallet, kartu kredit, dan aset." : undefined}
      footer={
        view.kind === "list" ? (
          <Button onClick={() => setView({ kind: "create" })}>
            <PlusIcon aria-hidden />
            Tambah akun
          </Button>
        ) : (
          <FormActions form="account-form" onCancel={toList} isSubmitting={saving} />
        )
      }
    >
      <ScrollArea className="w-full lg:h-64 pr-2">
        {view.kind === "list" && (
          <div className="pb-2">
            <AccountList onEdit={(account) => setView({ kind: "edit", account })} />
          </div>
        )}
        {view.kind === "create" && <AccountForm onDone={toList} onSubmitting={setSaving} />}
        {view.kind === "edit" && (
          <AccountForm
            key={view.account.id}
            account={view.account}
            onDone={toList}
            onSubmitting={setSaving}
          >
            <ArchiveButton
              label="Arsipkan akun"
              name={view.account.name}
              description={
                <>
                  {view.account.balance !== 0 && (
                    <>Saldo saat ini {formatIDR(view.account.balance)}. </>
                  )}
                  Akun disembunyikan dari daftar dan pilihan, tetapi tetap tercatat di transaksi
                  lama. Kamu bisa memulihkannya kapan saja.
                </>
              }
              archive={() => archiveAccount(view.account.id)}
              onArchived={toList}
              disabled={saving}
            />
          </AccountForm>
        )}
      </ScrollArea>
    </ResponsiveModal>
  );
}

function AccountList({ onEdit }: { onEdit: (account: Account) => void }) {
  const { data, error, mutate } = useAccounts();

  if (error) {
    return <LoadError onRetry={() => void mutate()} message="Gagal memuat akun." />;
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Memuat akun">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <p className="py-6 text-center text-muted-foreground">
        Belum ada akun. Tambahkan rekening atau e-wallet pertamamu.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {ACCOUNT_TYPES.map((type) => {
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
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function AccountSummary({ account }: { account: Account }) {
  const money = useAmountFormat();

  return (
    <div className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base">{account.name}</span>
        {account.subtype && (
          <span className="text-sm text-muted-foreground">
            {ACCOUNT_SUBTYPE_LABELS[account.subtype]}
          </span>
        )}
      </div>
      <span
        data-slot="account-balance"
        className={cn("shrink-0 text-base font-medium", account.balance < 0 && "text-destructive")}
      >
        {money(account.balance)}
      </span>
    </div>
  );
}
