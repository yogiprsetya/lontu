"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBackToList } from "@/hooks/use-back-to-list";
import { useProfile } from "@/hooks/use-profile";
import { advanceRule, revalidateRecurring } from "@/hooks/use-recurring";
import { createTransaction, updateTransaction } from "@/hooks/use-transactions";
import { todayInJakarta } from "@/lib/date";
import { ApiError } from "@/lib/fetcher";
import { applyServerErrors } from "@/lib/form-errors";
import { occurrenceDefaults, recurringPostBody } from "@/lib/recurring-form";
import { CATEGORY_KIND_FOR } from "@/lib/schemas/category";
import type { RecurringRule } from "@/lib/schemas/recurring";
import {
  MIN_TRANSACTION_DATE,
  type SimpleCreateInput,
  type SimpleTransactionType,
  type Transaction,
  simpleCreateSchema,
} from "@/lib/schemas/transaction";
import { signedEffect } from "@/lib/transaction-balance";
import { TRANSACTION_TYPE_LABELS } from "@/lib/transaction-types";
import { failureMessage } from "@/lib/offline/network-error";
import { inputClass } from "@/components/forms/field-styles";

type FormValues = z.input<typeof simpleCreateSchema>;

/** Catat for one occurrence of a recurring rule: saving advances the rule instead of a plain create. */
export type RecurringOccurrence = { rule: RecurringRule; occurrenceDate: string; onDone: () => void };

/**
 * Income, expense or saving. Waits for the server, then goes to the list.
 * With `transaction` it edits that row: the type is fixed and saving sends a PATCH.
 * With `recurring` it records that occurrence: the type is the rule's and saving calls advance.
 */
export function TransactionForm({
  type,
  transaction,
  recurring,
}: {
  type: SimpleTransactionType;
  transaction?: Transaction;
  recurring?: RecurringOccurrence;
}) {
  const router = useRouter();
  const { data: profile } = useProfile();
  const backToList = useBackToList();
  const today = todayInJakarta();
  // Once per form, not per submit, so Simpan tapped again after a lost response replays.
  const [recurringTxId, setRecurringTxId] = useState(() => crypto.randomUUID());
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, SimpleCreateInput>({
    resolver: zodResolver(simpleCreateSchema),
    defaultValues: recurring
      ? occurrenceDefaults(recurring.rule, recurring.occurrenceDate, today)
      : transaction
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
      if (recurring) {
        const { rule, occurrenceDate, onDone } = recurring;
        await advanceRule(rule.id, recurringPostBody(input, { id: recurringTxId, occurrenceDate }));
        toast.success(`${rule.name} dicatat`);
        onDone();
      } else if (transaction) {
        const { amount, date, accountId, categoryId, description } = input;
        await updateTransaction(transaction.id, { amount, date, accountId, categoryId, description });
        toast.success("Perubahan tersimpan");
        backToList();
      } else {
        const outcome = await createTransaction(input, { userId: profile?.id });
        if (outcome.status === "queued") toast("Disimpan di perangkat, dikirim saat online");
        else toast.success(`${TRANSACTION_TYPE_LABELS[type]} tersimpan`);
        router.push("/transactions");
      }
    } catch (err) {
      if (recurring && err instanceof ApiError && err.code === "OCCURRENCE_STALE") {
        toast("Kejadian ini sudah ditangani");
        recurring.onDone();
        void revalidateRecurring();
        return;
      }
      // The server proved this id is not this request's, so the next Simpan needs a new one.
      if (recurring && err instanceof ApiError && err.code === "TRANSACTION_ID_TAKEN") {
        setRecurringTxId(crypto.randomUUID());
        toast.error("Gagal menyimpan. Coba simpan lagi.");
        return;
      }
      if (!applyServerErrors(err, setError)) toast.error(failureMessage(err, "Gagal menyimpan transaksi. Coba lagi."));
    }
  });

  return (
    // In a modal (recurring) the drawer is already the surface, and there is no bottom nav to clear.
    <form onSubmit={onSubmit} noValidate className={recurring ? "flex flex-col gap-4" : "surface flex flex-col gap-4 px-5 py-5"}>
      {(transaction || recurring) && (
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
          className={inputClass}
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
          className={inputClass}
          autoComplete="off"
          maxLength={200}
          aria-invalid={!!errors.description}
          aria-describedby="transaction-description-message"
          {...register("description")}
        />
      </FormField>

      {recurring ? (
        <Button type="submit" className="mt-2 h-11 w-full text-base" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
          Simpan
        </Button>
      ) : (
        <StickySubmit isSubmitting={isSubmitting} />
      )}
    </form>
  );
}

