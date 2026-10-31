"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Controller,
  type Resolver,
  type UseFormReturn,
  type UseFormSetError,
  useForm,
  useFormState,
  useWatch,
} from "react-hook-form";
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
import { updateTransaction, useSubmitTransaction } from "@/hooks/use-transactions";
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
import { inputClass } from "@/components/forms/field-styles";

type FormValues = z.input<typeof transferCreateSchema>;
type Form = UseFormReturn<FormValues, unknown, TransferCreateInput>;

const baseResolver = zodResolver(transferCreateSchema);

function reportSaveError(err: unknown, setError: UseFormSetError<FormValues>) {
  if (!applyServerErrors(err, setError))
    toast.error(failureMessage(err, "Gagal menyimpan transfer. Coba lagi."));
}

/** Needs two active accounts; an optional admin fee is recorded as its own expense row. */
export function CreateTransferForm() {
  const { data: accounts } = useAccounts();
  const open = useUIStore((s) => s.open);

  if (!accounts) return <Skeleton className="h-64 w-full" aria-label="Memuat akun" />;
  if (accounts.length < 2) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed px-4 py-4">
        <p className="text-sm text-muted-foreground">Transfer butuh minimal dua akun aktif.</p>
        <Button
          type="button"
          variant="outline"
          className="h-11 text-base"
          onClick={() => open("manageAccounts")}
        >
          <PlusIcon aria-hidden />
          Tambah akun
        </Button>
      </div>
    );
  }
  return <CreateTransferFields />;
}

function CreateTransferFields() {
  const router = useRouter();
  const submit = useSubmitTransaction();
  const today = todayInJakarta();
  const [hasFee, setHasFee] = useState(false);
  // The fee inputs keep their values while unchecked; they are only validated and sent when checked.
  const resolver: Resolver<FormValues, unknown, TransferCreateInput> = (values, context, options) =>
    baseResolver(hasFee ? values : { ...values, fee: undefined }, context, options);
  const form = useForm<FormValues, unknown, TransferCreateInput>({
    resolver,
    defaultValues: {
      type: "transfer",
      amount: 0,
      date: today,
      accountId: "",
      toAccountId: "",
      description: "",
      fee: { amount: 0, categoryId: "" },
    },
  });
  const {
    control,
    clearErrors,
    formState: { errors, isSubmitting },
  } = form;
  const feeAmount = useWatch({ control, name: "fee.amount" });

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await submit(input, {
        sentMessage: input.fee ? "Transfer dan biaya admin tersimpan" : "Transfer tersimpan",
      });
      router.push("/transactions");
    } catch (err) {
      reportSaveError(err, form.setError);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="surface flex flex-col gap-4 px-5 py-5">
      <TransferFields form={form} today={today} extraOutflow={hasFee ? (feeAmount ?? 0) : 0} />
      <fieldset className="flex flex-col gap-4 rounded-2xl bg-muted px-4 py-3">
        <label className="flex min-h-11 items-center gap-3 text-base font-medium">
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
                <FormField
                  id="transfer-fee-amount"
                  label="Nominal biaya"
                  error={errors.fee?.amount?.message}
                >
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
                <FormField
                  id="transfer-fee-category"
                  label="Kategori biaya"
                  error={errors.fee?.categoryId?.message}
                >
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
            <p
              className={
                errors.fee?.message ? "text-sm text-destructive" : "text-sm text-muted-foreground"
              }
            >
              {errors.fee?.message ?? "Dicatat sebagai expense terpisah dari akun asal."}
            </p>
          </>
        )}
      </fieldset>
      <StickySubmit isSubmitting={isSubmitting} />
    </form>
  );
}

/** Edits a stored transfer: no fee block (the fee is its own expense row) and saving sends a PATCH. */
export function EditTransferForm({ transaction }: { transaction: Transaction }) {
  const { data: accounts } = useAccounts();
  if (!accounts) return <Skeleton className="h-64 w-full" aria-label="Memuat akun" />;
  return <EditTransferFields transaction={transaction} />;
}

function EditTransferFields({ transaction }: { transaction: Transaction }) {
  const backToList = useBackToList();
  const today = todayInJakarta();
  const form = useForm<FormValues, unknown, TransferCreateInput>({
    resolver: baseResolver,
    defaultValues: {
      type: "transfer",
      amount: transaction.amount,
      date: transaction.date,
      accountId: transaction.accountId,
      toAccountId: transaction.toAccountId ?? "",
      description: transaction.description ?? "",
    },
  });

  const onSubmit = form.handleSubmit(
    async ({ amount, date, accountId, toAccountId, description }) => {
      try {
        await updateTransaction(transaction.id, {
          amount,
          date,
          accountId,
          toAccountId,
          description,
        });
        toast.success("Perubahan tersimpan");
        backToList();
      } catch (err) {
        reportSaveError(err, form.setError);
      }
    },
  );

  return (
    <form onSubmit={onSubmit} noValidate className="surface flex flex-col gap-4 px-5 py-5">
      <TransferFields form={form} today={today} stored={transaction} />
      <p className="text-sm text-muted-foreground">
        Biaya admin dicatat sebagai expense terpisah. Mengubah atau menghapus transfer ini tidak
        mengubahnya.
      </p>
      <StickySubmit isSubmitting={form.formState.isSubmitting} />
    </form>
  );
}

/**
 * The fields both variants share. `stored` is the transfer being edited, if any;
 * `extraOutflow` is anything else leaving the source account, such as the admin fee.
 */
function TransferFields({
  form: { control, register, setValue },
  today,
  stored,
  extraOutflow = 0,
}: {
  form: Form;
  today: string;
  stored?: Transaction;
  extraOutflow?: number;
}) {
  const { errors } = useFormState({ control });
  const [accountId, toAccountId, amount] = useWatch({
    control,
    name: ["accountId", "toAccountId", "amount"],
  });
  const warning = useShortBalanceWarning(
    accountId,
    -(amount + extraOutflow),
    stored && { accountId: stored.accountId, effect: -stored.amount },
  );

  return (
    <>
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
          <FormField
            id="transfer-account"
            label="Dari akun"
            error={errors.accountId?.message}
            hint={warning}
          >
            <AccountPicker
              id="transfer-account"
              value={field.value}
              onChange={(id) => {
                field.onChange(id);
                if (id === toAccountId) setValue("toAccountId", "");
              }}
              keep={stored?.accountId}
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
              keep={stored?.toAccountId ?? undefined}
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
          className={inputClass}
          min={MIN_TRANSACTION_DATE}
          max={today}
          aria-invalid={!!errors.date}
          aria-describedby="transfer-date-message"
          {...register("date")}
        />
      </FormField>

      <FormField
        id="transfer-description"
        label="Deskripsi (opsional)"
        error={errors.description?.message}
      >
        <Input
          id="transfer-description"
          className={inputClass}
          autoComplete="off"
          maxLength={200}
          aria-invalid={!!errors.description}
          aria-describedby="transfer-description-message"
          {...register("description")}
        />
      </FormField>
    </>
  );
}
