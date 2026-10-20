"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { AccountForm } from "@/components/forms/account-form";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { formatIDR } from "@/lib/money";
import { ACCOUNT_SUBTYPE_LABELS, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPES, type Account } from "@/lib/schemas/account";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/stores/ui";

type View = "list" | "create";

export function ManageAccounts({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [view, setView] = useState<View>("list");

  function handleOpenChange(next: boolean) {
    if (next) return;
    onClose();
    setView("list");
  }

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleOpenChange}
      title={view === "list" ? "Kelola akun" : "Tambah akun"}
      description={view === "list" ? "Rekening, e-wallet, kartu kredit, dan aset." : undefined}
      footer={
        view === "list" ? (
          <Button className="h-11 text-base" onClick={() => setView("create")}>
            <PlusIcon aria-hidden />
            Tambah akun
          </Button>
        ) : undefined
      }
    >
      <div className="lg:max-h-[60vh] lg:overflow-y-auto">
        {view === "list" ? (
          <AccountList />
        ) : (
          <AccountForm onDone={() => setView("list")} onCancel={() => setView("list")} />
        )}
      </div>
    </ResponsiveModal>
  );
}

function AccountList() {
  const { data, error, mutate } = useAccounts();

  if (error) return <LoadError onRetry={() => void mutate()} message="Gagal memuat akun." />;
  if (!data) {
    return (
      <div className="flex flex-col gap-2 py-2" aria-busy="true" aria-label="Memuat akun">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }
  if (data.length === 0) {
    return <p className="py-6 text-center text-muted-foreground">Belum ada akun. Tambahkan rekening atau e-wallet pertamamu.</p>;
  }

  return (
    <div className="flex flex-col gap-4 pb-2">
      {ACCOUNT_TYPES.map((type) => {
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
                  <AccountRow account={account} />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function AccountRow({ account }: { account: Account }) {
  const hideAmounts = useUIStore((s) => s.hideAmounts);

  return (
    <div className="flex min-h-14 items-center gap-3 py-2">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-base">{account.name}</span>
        {account.subtype && (
          <span className="text-sm text-muted-foreground">{ACCOUNT_SUBTYPE_LABELS[account.subtype]}</span>
        )}
      </div>
      <span className={cn("shrink-0 text-base font-medium", account.balance < 0 && "text-destructive")}>
        {hideAmounts ? "Rp•••••" : formatIDR(account.balance)}
      </span>
    </div>
  );
}
