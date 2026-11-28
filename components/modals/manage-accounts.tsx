"use client";

import { useEffect, useState } from "react";
import { ChevronRightIcon, PlusIcon, CloudSyncIcon } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { AccountForm } from "@/components/forms/account-form";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { Input } from "@/components/ui/input";
import { FormActions } from "@/components/layout/form-actions";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { ArchiveButton } from "@/components/modals/archive-controls";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { archiveAccount, reconcileAccount, useAccounts } from "@/hooks/use-accounts";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { formatIDR } from "@/lib/money";
import {
  ACCOUNT_SUBTYPE_LABELS,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPES,
  accountReconcileSchema,
  type Account,
} from "@/lib/schemas/account";
import { applyServerErrors } from "@/lib/form-errors";
import { failureMessage } from "@/lib/offline/network-error";
import { cn } from "@/lib/utils";
import type { z } from "zod";

type View =
  | { kind: "list" }
  | { kind: "create" }
  | { kind: "edit"; account: Account }
  | { kind: "reconcile"; account: Account };

const titles = {
  list: "Kelola akun",
  create: "Tambah akun",
  edit: "Ubah akun",
  reconcile: "Koreksi saldo",
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
        ) : view.kind === "reconcile" ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={toList}
              disabled={saving}
            >
              Batal
            </Button>

            <Button type="submit" form="reconcile-form" className="flex-1" disabled={saving}>
              {saving ? "Menyimpan…" : "Koreksi saldo"}
            </Button>
          </div>
        ) : (
          <FormActions form="account-form" onCancel={toList} isSubmitting={saving} />
        )
      }
    >
      {view.kind === "list" && (
        <ScrollArea className="w-full lg:h-80 pr-1">
          <div className="pb-2">
            <AccountList
              onEdit={(account) => setView({ kind: "edit", account })}
              onReconcile={(account) => setView({ kind: "reconcile", account })}
            />
          </div>
        </ScrollArea>
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
                Akun disembunyikan dari daftar dan pilihan, tetapi tetap tercatat di transaksi lama.
                Kamu bisa memulihkannya kapan saja.
              </>
            }
            archive={() => archiveAccount(view.account.id)}
            onArchived={toList}
            disabled={saving}
          />
        </AccountForm>
      )}
      {view.kind === "reconcile" && (
        <ReconcileForm account={view.account} onDone={toList} onSubmitting={setSaving} />
      )}
    </ResponsiveModal>
  );
}

function AccountList({
  onEdit,
  onReconcile,
}: {
  onEdit: (account: Account) => void;
  onReconcile: (account: Account) => void;
}) {
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
                <li key={account.id} className="flex gap-1 items-center">
                  <button
                    type="button"
                    onClick={() => onEdit(account)}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 text-left outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <AccountSummary account={account} />

                    <ChevronRightIcon
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  </button>

                  {account.type === "transaction" && (
                    <div className="shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Koreksi saldo ${account.name}`}
                        title="Koreksi saldo"
                        onClick={() => onReconcile(account)}
                      >
                        <CloudSyncIcon aria-hidden />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

type ReconcileValues = z.infer<typeof accountReconcileSchema>;

function ReconcileForm({
  account,
  onDone,
  onSubmitting,
}: {
  account: Account;
  onDone: () => void;
  onSubmitting: (value: boolean) => void;
}) {
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReconcileValues>({
    resolver: zodResolver(accountReconcileSchema),
    defaultValues: { balance: account.balance },
  });

  useEffect(() => {
    onSubmitting(isSubmitting);
  }, [isSubmitting, onSubmitting]);

  const submit = handleSubmit(async ({ balance, description }) => {
    try {
      await reconcileAccount(account.id, balance, description);
      toast.success("Saldo akun dikoreksi");
      onDone();
    } catch (err) {
      if (!applyServerErrors(err, setError)) {
        toast.error(failureMessage(err, "Gagal mengoreksi saldo. Coba lagi."));
      }
    }
  });

  return (
    <form id="reconcile-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Saldo saat ini {formatIDR(account.balance)}. Masukkan saldo aktual; selisih akan dicatat
        sebagai transaksi koreksi.
      </p>
      <Controller
        control={control}
        name="balance"
        render={({ field }) => (
          <FormField id="reconcile-balance" label="Saldo aktual" error={errors.balance?.message}>
            <MoneyInput
              id="reconcile-balance"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={!!errors.balance}
              describedBy="reconcile-balance-message"
            />
          </FormField>
        )}
      />
      <FormField
        id="reconcile-description"
        label="Deskripsi (opsional)"
        error={errors.description?.message}
        hint="Maksimal 200 karakter."
      >
        <Input
          id="reconcile-description"
          placeholder="mis. Saldo rekening per akhir bulan"
          maxLength={200}
          aria-invalid={!!errors.description}
          aria-describedby="reconcile-description-message"
          {...register("description")}
        />
      </FormField>
    </form>
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
