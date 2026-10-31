"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import {
  Controller,
  type DefaultValues,
  type UseFormReturn,
  type UseFormSetError,
  useForm,
  useFormState,
  useWatch,
} from "react-hook-form";
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
import { advanceRule, revalidateRecurring } from "@/hooks/use-recurring";
import { updateTransaction, useSubmitTransaction } from "@/hooks/use-transactions";
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
type Form = UseFormReturn<FormValues, unknown, SimpleCreateInput>;

const formClass = "flex flex-col gap-4";
// On a page the form is its own surface; in a modal the drawer already is one.
const pageFormClass = "surface flex flex-col gap-4 px-5 py-5";

function useTransactionForm(defaultValues: DefaultValues<FormValues>): Form {
  return useForm<FormValues, unknown, SimpleCreateInput>({
    resolver: zodResolver(simpleCreateSchema),
    defaultValues,
  });
}

function reportSaveError(err: unknown, setError: UseFormSetError<FormValues>) {
  if (!applyServerErrors(err, setError))
    toast.error(failureMessage(err, "Gagal menyimpan transaksi. Coba lagi."));
}

/** Income, expense or saving. Waits for the server, then goes to the list. */
export function CreateTransactionForm({ type }: { type: SimpleTransactionType }) {
  const router = useRouter();
  const submit = useSubmitTransaction();
  const today = todayInJakarta();
  const form = useTransactionForm({
    type,
    amount: 0,
    date: today,
    accountId: "",
    categoryId: "",
    description: "",
  });

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await submit(input, { sentMessage: `${TRANSACTION_TYPE_LABELS[type]} tersimpan` });
      router.push("/transactions");
    } catch (err) {
      reportSaveError(err, form.setError);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className={pageFormClass}>
      <TransactionFields form={form} type={type} today={today} />
      <StickySubmit isSubmitting={form.formState.isSubmitting} />
    </form>
  );
}

/** Edits a stored row: the type is fixed and saving sends a PATCH. */
export function EditTransactionForm({
  type,
  transaction,
}: {
  type: SimpleTransactionType;
  transaction: Transaction;
}) {
  const backToList = useBackToList();
  const today = todayInJakarta();
  const form = useTransactionForm({
    type,
    amount: transaction.amount,
    date: transaction.date,
    accountId: transaction.accountId,
    categoryId: transaction.categoryId ?? "",
    description: transaction.description ?? "",
  });

  const onSubmit = form.handleSubmit(
    async ({ amount, date, accountId, categoryId, description }) => {
      try {
        await updateTransaction(transaction.id, {
          amount,
          date,
          accountId,
          categoryId,
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
    <form onSubmit={onSubmit} noValidate className={pageFormClass}>
      <FixedType type={type} />
      <TransactionFields form={form} type={type} today={today} stored={transaction} />
      <StickySubmit isSubmitting={form.formState.isSubmitting} />
    </form>
  );
}

/** Catat for one occurrence of a recurring rule: saving advances the rule instead of a plain create. */
export function RecordOccurrenceForm({
  rule,
  occurrenceDate,
  onDone,
}: {
  rule: RecurringRule;
  occurrenceDate: string;
  onDone: () => void;
}) {
  const today = todayInJakarta();
  // Once per form, not per submit, so Simpan tapped again after a lost response replays.
  const [transactionId, setTransactionId] = useState(() => crypto.randomUUID());
  const form = useTransactionForm(occurrenceDefaults(rule, occurrenceDate, today));
  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await advanceRule(rule.id, recurringPostBody(input, { id: transactionId, occurrenceDate }));
      toast.success(`${rule.name} dicatat`);
      onDone();
    } catch (err) {
      if (err instanceof ApiError && err.code === "OCCURRENCE_STALE") {
        toast("Kejadian ini sudah ditangani");
        onDone();
        void revalidateRecurring();
        return;
      }
      // The server proved this id is not this request's, so the next Simpan needs a new one.
      if (err instanceof ApiError && err.code === "TRANSACTION_ID_TAKEN") {
        setTransactionId(crypto.randomUUID());
        toast.error("Gagal menyimpan. Coba simpan lagi.");
        return;
      }
      reportSaveError(err, form.setError);
    }
  });

  return (
    // No bottom nav to clear in a modal, so the button sits inline.
    <form onSubmit={onSubmit} noValidate className={formClass}>
      <FixedType type={rule.type} />
      <TransactionFields form={form} type={rule.type} today={today} />
      <Button type="submit" className="mt-2 h-11 w-full text-base" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
        Simpan
      </Button>
    </form>
  );
}

function FixedType({ type }: { type: SimpleTransactionType }) {
  return (
    <p className="text-sm text-muted-foreground">
      Jenis: <span className="font-medium text-foreground">{TRANSACTION_TYPE_LABELS[type]}</span>{" "}
      (tidak bisa diubah)
    </p>
  );
}

/** The fields every variant shares. `stored` is the row being edited, if any. */
function TransactionFields({
  form: { control, register },
  type,
  today,
  stored,
}: {
  form: Form;
  type: SimpleTransactionType;
  today: string;
  stored?: Transaction;
}) {
  const { errors } = useFormState({ control });
  const [accountId, amount] = useWatch({ control, name: ["accountId", "amount"] });
  const warning = useShortBalanceWarning(
    accountId,
    signedEffect(type, amount),
    stored && { accountId: stored.accountId, effect: signedEffect(type, stored.amount) },
  );

  return (
    <>
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
          <FormField
            id="transaction-account"
            label="Akun"
            error={errors.accountId?.message}
            hint={warning}
          >
            <AccountPicker
              id="transaction-account"
              value={field.value}
              onChange={field.onChange}
              keep={stored?.accountId}
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
              keep={stored?.categoryId ?? undefined}
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

      <FormField
        id="transaction-description"
        label="Deskripsi (opsional)"
        error={errors.description?.message}
      >
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
    </>
  );
}
