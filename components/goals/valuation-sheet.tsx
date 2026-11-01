"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/forms/form-field";
import { inputClass } from "@/components/forms/field-styles";
import { MoneyInput } from "@/components/forms/money-input";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAmountFormat, useAmountsHidden } from "@/hooks/use-amount-format";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { recordValuations } from "@/hooks/use-valuations";
import { todayInJakarta } from "@/lib/date";
import { ApiError } from "@/lib/fetcher";
import { failureMessage } from "@/lib/offline/network-error";
import { ACCOUNT_SUBTYPE_LABELS, type Account } from "@/lib/schemas/account";
import { MIN_TRANSACTION_DATE } from "@/lib/schemas/transaction";
import type { AssetValuation } from "@/lib/schemas/valuation";
import { changedItems, checkInMessage, valuedLabel } from "@/lib/valuation-format";

type Errors = { date?: string; form?: string; rows: Record<string, string> };

const NO_ERRORS: Errors = { rows: {} };

type FormProps = {
  assets: AssetValuation[];
  accounts: Map<string, Account>;
  onSubmitting: (submitting: boolean) => void;
  onDone: () => void;
};

function ValuationForm({ assets, accounts, onSubmitting, onDone }: FormProps) {
  const today = todayInJakarta();
  const hidden = useAmountsHidden();
  const money = useAmountFormat();
  const [date, setDate] = useState(today);
  // Only rows the owner touched; while amounts are hidden the fields start empty instead of showing the balance.
  const [values, setValues] = useState<ReadonlyMap<string, number>>(new Map());
  const [errors, setErrors] = useState<Errors>(NO_ERRORS);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const items = changedItems(assets, values);
    if (items.length === 0) {
      toast.success(checkInMessage(0));
      onDone();
      return;
    }
    setErrors(NO_ERRORS);
    onSubmitting(true);
    try {
      const { recorded } = await recordValuations({ date, items });
      toast.success(checkInMessage(recorded));
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        const rows: Record<string, string> = {};
        // `items.<i>` indexes the rows that were sent, not the whole list.
        items.forEach(({ accountId }, i) => {
          const message = err.fields?.[`items.${i}`]?.[0];
          if (message) rows[accountId] = message;
        });
        setErrors({ date: err.fields.date?.[0], form: err.fields.items?.[0], rows });
      } else {
        toast.error(failureMessage(err, "Gagal menyimpan nilai. Coba lagi."));
      }
    } finally {
      onSubmitting(false);
    }
  }

  return (
    <form id="valuation-form" onSubmit={submit} noValidate className="flex flex-col gap-5 pb-2">
      <FormField id="valuation-date" label="Tanggal nilai" error={errors.date}>
        <Input
          id="valuation-date"
          type="date"
          className={inputClass}
          min={MIN_TRANSACTION_DATE}
          max={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-invalid={!!errors.date}
          aria-describedby="valuation-date-message"
        />
      </FormField>
      {hidden && (
        <p className="text-sm text-muted-foreground">
          Nominal disembunyikan. Isi nilai baru hanya untuk akun yang berubah.
        </p>
      )}
      {errors.form && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {errors.form}
        </p>
      )}
      {assets.map((asset) => {
        const account = accounts.get(asset.accountId);
        const id = `valuation-${asset.accountId}`;
        const error = errors.rows[asset.accountId];
        const subtype = account?.subtype ? ACCOUNT_SUBTYPE_LABELS[account.subtype] : "Aset";
        const hint = [
          `${subtype} · ${valuedLabel(asset.lastValuedAt, today)}`,
          `Saat ini ${money(asset.balance)}`,
          account?.subtype === "gold" && "Pakai harga buyback hari ini",
        ]
          .filter(Boolean)
          .join(". ");
        return (
          <FormField
            key={asset.accountId}
            id={id}
            label={account?.name ?? "Akun"}
            error={error}
            hint={hint}
          >
            <MoneyInput
              id={id}
              value={values.get(asset.accountId) ?? (hidden ? 0 : asset.balance)}
              onChange={(value) => setValues((prev) => new Map(prev).set(asset.accountId, value))}
              invalid={!!error}
              describedBy={`${id}-message`}
            />
          </FormField>
        );
      })}
    </form>
  );
}

type SheetProps = {
  open: boolean;
  onClose: () => void;
  assets: AssetValuation[];
  accounts: Map<string, Account>;
};

/** Perbarui nilai: the owner types each asset's value today; the server records the differences. */
export function ValuationSheet({ open, onClose, assets, accounts }: SheetProps) {
  const online = useOnlineStatus();
  const [submitting, setSubmitting] = useState(false);

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={(next) => !next && !submitting && onClose()}
      title="Perbarui nilai"
      description="Ketik nilai terkini dari aplikasi investasi atau harga emas. Akun yang tidak diubah tidak dicatat."
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
              disabled={submitting}
              onClick={onClose}
            >
              Batal
            </Button>
            <Button
              type="submit"
              form="valuation-form"
              className="h-11 flex-1 text-base"
              disabled={!online || submitting}
            >
              {submitting && <Loader2Icon className="animate-spin" aria-hidden />}
              Simpan
            </Button>
          </div>
        </div>
      }
    >
      {open && (
        <ValuationForm
          assets={assets}
          accounts={accounts}
          onSubmitting={setSubmitting}
          onDone={onClose}
        />
      )}
    </ResponsiveModal>
  );
}
