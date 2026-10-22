"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { z } from "zod";
import { AccountPicker } from "@/components/forms/account-picker";
import { useShortBalanceWarning } from "@/components/forms/balance-warning";
import { CategoryPicker } from "@/components/forms/category-picker";
import { FormField } from "@/components/forms/form-field";
import { StickySubmit } from "@/components/forms/sticky-submit";
import { MoneyInput } from "@/components/forms/money-input";
import { Input } from "@/components/ui/input";
import { useBackToList } from "@/hooks/use-back-to-list";
import { createTransaction, updateTransaction } from "@/hooks/use-transactions";
import { todayInJakarta } from "@/lib/date";
import { applyServerErrors } from "@/lib/form-errors";
import { CATEGORY_KIND_FOR } from "@/lib/schemas/category";
import {
  MIN_TRANSACTION_DATE,
  type SimpleCreateInput,
  type SimpleTransactionType,
  type Transaction,
  simpleCreateSchema,
} from "@/lib/schemas/transaction";
import { signedEffect } from "@/lib/transaction-balance";
import { TRANSACTION_TYPE_LABELS } from "@/lib/transaction-types";

type FormValues = z.input<typeof simpleCreateSchema>;

/**
 * Income, expense or saving. Waits for the server, then goes to the list.
 * With `transaction` it edits that row: the type is fixed and saving sends a PATCH.
 */
export function TransactionForm({ type, transaction }: { type: SimpleTransactionType; transaction?: Transaction }) {
  const router = useRouter();
  const backToList = useBackToList();
  const today = todayInJakarta();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, SimpleCreateInput>({
    resolver: zodResolver(simpleCreateSchema),
    defaultValues: transaction
      ? {
          type,
          amount: transaction.amount,
          date: transaction.date,
          accountId: transaction.accountId,
          categoryId: transaction.categoryId ?? "",
          description: transaction.description ?? "",
        }
      : { type, amount: 0, date: today, accountId: "", categoryId: "", description: "" },
  });
  const [accountId, amount] = useWatch({ control, name: ["accountId", "amount"] });
  const warning = useShortBalanceWarning(
    accountId,
    signedEffect(type, amount),
    transaction && { accountId: transaction.accountId, effect: signedEffect(type, transaction.amount) },
  );

  const onSubmit = handleSubmit(async (input) => {
    try {
      if (transaction) {
        const { amount, date, accountId, categoryId, description } = input;
        await updateTransaction(transaction.id, { amount, date, accountId, categoryId, description });
        toast.success("Perubahan tersimpan");
        backToList();
      } else {
        await createTransaction(input);
        toast.success(`${TRANSACTION_TYPE_LABELS[type]} tersimpan`);
        router.push("/transactions");
      }
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error("Gagal menyimpan transaksi. Coba lagi.");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {transaction && (
        <p className="text-sm text-muted-foreground">
          Jenis: <span className="font-medium text-foreground">{TRANSACTION_TYPE_LABELS[type]}</span> (tidak bisa diubah)
        </p>
      )}

      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <FormField id="transaction-amount" label="Nominal" error={errors.amount?.message}>
            <MoneyInput
              id="transaction-amount"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={!!errors.amount}
              describedBy="transaction-amount-message"
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="accountId"
        render={({ field }) => (
          <FormField id="transaction-account" label="Akun" error={errors.accountId?.message} hint={warning}>
            <AccountPicker
              id="transaction-account"
              value={field.value}
              onChange={field.onChange}
              keep={transaction?.accountId}
              invalid={!!errors.accountId}
              describedBy="transaction-account-message"
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="categoryId"
        render={({ field }) => (
          <FormField id="transaction-category" label="Kategori" error={errors.categoryId?.message}>
            <CategoryPicker
              id="transaction-category"
              kind={CATEGORY_KIND_FOR[type]}
              keep={transaction?.categoryId ?? undefined}
              value={field.value}
              onChange={field.onChange}
              invalid={!!errors.categoryId}
              describedBy="transaction-category-message"
            />
          </FormField>
        )}
      />

      <FormField id="transaction-date" label="Tanggal" error={errors.date?.message}>
        <Input
          id="transaction-date"
          type="date"
          className="h-11"
          min={MIN_TRANSACTION_DATE}
          max={today}
          aria-invalid={!!errors.date}
          aria-describedby="transaction-date-message"
          {...register("date")}
        />
      </FormField>

      <FormField id="transaction-description" label="Deskripsi (opsional)" error={errors.description?.message}>
        <Input
          id="transaction-description"
          className="h-11"
          autoComplete="off"
          maxLength={200}
          aria-invalid={!!errors.description}
          aria-describedby="transaction-description-message"
          {...register("description")}
        />
      </FormField>

      <StickySubmit isSubmitting={isSubmitting} />
    </form>
  );
}

