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
import { checkInMessage, valuedLabel } from "@/lib/valuation-format";

type Errors = { date?: string; value?: string; form?: string };

type FormProps = {
  asset: AssetValuation;
  account: Account | undefined;
  onSubmitting: (submitting: boolean) => void;
  onDone: () => void;
};

function ValuationForm({ asset, account, onSubmitting, onDone }: FormProps) {
  const today = todayInJakarta();
  const hidden = useAmountsHidden();
  const money = useAmountFormat();
  const [date, setDate] = useState(today);
  // Unset until the owner types; while amounts are hidden the field starts empty instead of showing the balance.
  const [value, setValue] = useState<number>();
  const [errors, setErrors] = useState<Errors>({});
  const name = account?.name ?? "Akun";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value === undefined || value === asset.balance) {
      toast.success(checkInMessage(0, name));
      onDone();
      return;
    }
    setErrors({});
    onSubmitting(true);
    try {
      const { recorded } = await recordValuations({
        date,
        items: [{ accountId: asset.accountId, value }],
      });
      toast.success(checkInMessage(recorded, name));
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setErrors({
          date: err.fields.date?.[0],
          value: err.fields["items.0"]?.[0],
          form: err.fields.items?.[0],
        });
      } else {
        toast.error(failureMessage(err, "Gagal menyimpan nilai. Coba lagi."));
      }
    } finally {
      onSubmitting(false);
    }
  }

  const id = `valuation-${asset.accountId}`;
  const subtype = account?.subtype ? ACCOUNT_SUBTYPE_LABELS[account.subtype] : "Aset";
  const hint = [
    `${subtype} · ${valuedLabel(asset.lastValuedAt, today)}`,
    `Saat ini ${money(asset.balance)}`,
    account?.subtype === "gold" && "Pakai harga buyback hari ini",
  ]
    .filter(Boolean)
    .join(". ");

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
          Nominal disembunyikan. Isi nilai baru jika nilainya berubah.
        </p>
      )}
      {errors.form && (
        <p role="alert" className="text-sm font-semibold text-destructive">
          {errors.form}
        </p>
      )}
      <FormField id={id} label={name} error={errors.value} hint={hint}>
        <MoneyInput
          id={id}
          value={value ?? (hidden ? 0 : asset.balance)}
          onChange={setValue}
          invalid={!!errors.value}
          describedBy={`${id}-message`}
        />
      </FormField>
    </form>
  );
}

type SheetProps = {
  /** The asset being valued; the sheet is closed while undefined. */
  asset: AssetValuation | undefined;
  account: Account | undefined;
  onClose: () => void;
};

/** Perbarui nilai: the owner types one asset's value today; the server records the difference. */
export function ValuationSheet({ asset, account, onClose }: SheetProps) {
  const online = useOnlineStatus();
  const [submitting, setSubmitting] = useState(false);

  return (
    <ResponsiveModal
      open={!!asset}
      onOpenChange={(next) => !next && !submitting && onClose()}
      title="Perbarui nilai"
      description="Ketik nilai terkini dari aplikasi investasi atau harga emas. Nilai hanya bisa diperbarui sekali sehari."
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
              className="flex-1 text-base"
              disabled={submitting}
              onClick={onClose}
            >
              Batal
            </Button>

            <Button
              type="submit"
              form="valuation-form"
              className="flex-1 text-base"
              disabled={!online || submitting}
            >
              {submitting && <Loader2Icon className="animate-spin" aria-hidden />}
              Simpan
            </Button>
          </div>
        </div>
      }
    >
      {asset && (
        <ValuationForm
          key={asset.accountId}
          asset={asset}
          account={account}
          onSubmitting={setSubmitting}
          onDone={onClose}
        />
      )}
    </ResponsiveModal>
  );
}
