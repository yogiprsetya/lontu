"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, type Resolver, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { AccountPicker } from "@/components/forms/account-picker";
import { useShortBalanceWarning } from "@/components/forms/balance-warning";
import { CategoryPicker } from "@/components/forms/category-picker";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { StickySubmit } from "@/components/forms/sticky-submit";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { useBackToList } from "@/hooks/use-back-to-list";
import { useProfile } from "@/hooks/use-profile";
import { createTransaction, updateTransaction } from "@/hooks/use-transactions";
import { todayInJakarta } from "@/lib/date";
import { applyServerErrors } from "@/lib/form-errors";
import {
  MIN_TRANSACTION_DATE,
  type Transaction,
  type TransferCreateInput,
  transferCreateSchema,
} from "@/lib/schemas/transaction";
import { useUIStore } from "@/stores/ui";
import { failureMessage } from "@/lib/offline/network-error";

type FormValues = z.input<typeof transferCreateSchema>;

const baseResolver = zodResolver(transferCreateSchema);

/** With `transaction` it edits that transfer: no fee block (the fee is its own expense row) and saving sends a PATCH. */
export function TransferForm({ transaction }: { transaction?: Transaction }) {
  const { data: accounts } = useAccounts();
  const open = useUIStore((s) => s.open);

  if (!accounts) return <Skeleton className="h-64 w-full" aria-label="Memuat akun" />;
  if (!transaction && accounts.length < 2) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed px-4 py-4">
        <p className="text-sm text-muted-foreground">Transfer butuh minimal dua akun aktif.</p>
        <Button type="button" variant="outline" className="h-11 text-base" onClick={() => open("manageAccounts")}>
          <PlusIcon aria-hidden />
          Tambah akun
        </Button>
      </div>
    );
  }
  return <TransferFields transaction={transaction} />;
}

function TransferFields({ transaction }: { transaction?: Transaction }) {
  const router = useRouter();
  const { data: profile } = useProfile();
  const backToList = useBackToList();
  const today = todayInJakarta();
  const [hasFee, setHasFee] = useState(false);
  // The fee inputs keep their values while unchecked; they are only validated and sent when checked.
  const resolver: Resolver<FormValues, unknown, TransferCreateInput> = (values, context, options) =>
    baseResolver(hasFee ? values : { ...values, fee: undefined }, context, options);
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, TransferCreateInput>({
    resolver,
    defaultValues: {
      type: "transfer",
      amount: transaction?.amount ?? 0,
      date: transaction?.date ?? today,
      accountId: transaction?.accountId ?? "",
      toAccountId: transaction?.toAccountId ?? "",
      description: transaction?.description ?? "",
      fee: { amount: 0, categoryId: "" },
    },
  });
  const [accountId, toAccountId, amount, fee] = useWatch({
    control,
    name: ["accountId", "toAccountId", "amount", "fee"],
  });
  const warning = useShortBalanceWarning(
    accountId,
    -(amount + (hasFee ? (fee?.amount ?? 0) : 0)),
    transaction && { accountId: transaction.accountId, effect: -transaction.amount },
  );

  const onSubmit = handleSubmit(async (input) => {
    try {
      if (transaction) {
        const { amount, date, accountId, toAccountId, description } = input;
        await updateTransaction(transaction.id, { amount, date, accountId, toAccountId, description });
        toast.success("Perubahan tersimpan");
        backToList();
      } else {
        const outcome = await createTransaction(input, { userId: profile?.id });
        if (outcome.status === "queued") toast("Disimpan di perangkat, dikirim saat online");
        else toast.success(input.fee ? "Transfer dan biaya admin tersimpan" : "Transfer tersimpan");
        router.push("/transactions");
      }
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(failureMessage(err, "Gagal menyimpan transfer. Coba lagi."));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <FormField id="transfer-amount" label="Nominal" error={errors.amount?.message}>
            <MoneyInput
              id="transfer-amount"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={!!errors.amount}
              describedBy="transfer-amount-message"
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="accountId"
        render={({ field }) => (
          <FormField id="transfer-account" label="Dari akun" error={errors.accountId?.message} hint={warning}>
            <AccountPicker
              id="transfer-account"
              value={field.value}
              onChange={(id) => {
                field.onChange(id);
                if (id === toAccountId) setValue("toAccountId", "");
              }}
              keep={transaction?.accountId}
              invalid={!!errors.accountId}
              describedBy="transfer-account-message"
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="toAccountId"
        render={({ field }) => (
          <FormField id="transfer-to-account" label="Ke akun" error={errors.toAccountId?.message}>
            <AccountPicker
              id="transfer-to-account"
              value={field.value}
              onChange={field.onChange}
              exclude={accountId || undefined}
              keep={transaction?.toAccountId ?? undefined}
              invalid={!!errors.toAccountId}
              describedBy="transfer-to-account-message"
            />
          </FormField>
        )}
      />

      <FormField id="transfer-date" label="Tanggal" error={errors.date?.message}>
        <Input
          id="transfer-date"
          type="date"
          className="h-11"
          min={MIN_TRANSACTION_DATE}
          max={today}
          aria-invalid={!!errors.date}
          aria-describedby="transfer-date-message"
          {...register("date")}
        />
      </FormField>

      <FormField id="transfer-description" label="Deskripsi (opsional)" error={errors.description?.message}>
        <Input
          id="transfer-description"
          className="h-11"
          autoComplete="off"
          maxLength={200}
          aria-invalid={!!errors.description}
          aria-describedby="transfer-description-message"
          {...register("description")}
        />
      </FormField>

      {transaction ? (
        <p className="text-sm text-muted-foreground">
          Biaya admin dicatat sebagai expense terpisah. Mengubah atau menghapus transfer ini tidak mengubahnya.
        </p>
      ) : (
        <fieldset className="flex flex-col gap-4 rounded-lg border px-4 py-2">
          <label className="flex min-h-11 items-center gap-3 text-base md:text-sm">
            <Checkbox
              checked={hasFee}
              onCheckedChange={(checked) => {
                setHasFee(checked);
                if (!checked) clearErrors("fee");
              }}
            />
            Biaya admin
          </label>
          {hasFee && (
            <>
              <Controller
                control={control}
                name="fee.amount"
                render={({ field }) => (
                  <FormField id="transfer-fee-amount" label="Nominal biaya" error={errors.fee?.amount?.message}>
                    <MoneyInput
                      id="transfer-fee-amount"
                      value={field.value ?? 0}
                      onChange={field.onChange}
                      onBlur={field.onBlur}
                      invalid={!!errors.fee?.amount}
                      describedBy="transfer-fee-amount-message"
                    />
                  </FormField>
                )}
              />
              <Controller
                control={control}
                name="fee.categoryId"
                render={({ field }) => (
                  <FormField id="transfer-fee-category" label="Kategori biaya" error={errors.fee?.categoryId?.message}>
                    <CategoryPicker
                      id="transfer-fee-category"
                      kind="spending"
                      value={field.value ?? ""}
                      onChange={field.onChange}
                      invalid={!!errors.fee?.categoryId}
                      describedBy="transfer-fee-category-message"
                    />
                  </FormField>
                )}
              />
              {/* Server-side fee errors arrive on `fields.fee` as a whole, not per input. */}
              <p className={errors.fee?.message ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                {errors.fee?.message ?? "Dicatat sebagai expense terpisah dari akun asal."}
              </p>
            </>
          )}
        </fieldset>
      )}

      <StickySubmit isSubmitting={isSubmitting} />
    </form>
  );
}
