"use client";

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
import { RecordTransferOccurrenceForm } from "@/components/forms/transfer-form";
import { DateField } from "@/components/forms/date-field";
import { FormField } from "@/components/forms/form-field";
import { StickySubmit } from "@/components/forms/sticky-submit";
import { MoneyInput } from "@/components/forms/money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useBackToList } from "@/hooks/use-back-to-list";
import { useRecordOccurrence } from "@/hooks/use-recurring";
import { updateTransaction, useSubmitTransaction } from "@/hooks/use-transactions";
import { todayInJakarta } from "@/lib/date";
import { applyServerErrors } from "@/lib/form-errors";
import { occurrenceDefaults, recurringPostBody } from "@/lib/recurring-form";
import { CATEGORY_KIND_FOR } from "@/lib/schemas/category";
import type { RecurringRule, SimpleRule } from "@/lib/schemas/recurring";
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

/** Income or expense. Waits for the server, then goes to the list. */
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

type OccurrenceProps<Rule> = { rule: Rule; occurrenceDate: string; onDone: () => void };

/** Catat for one occurrence of a recurring rule: saving advances the rule instead of a plain create. */
export function RecordOccurrenceForm({ rule, ...rest }: OccurrenceProps<RecurringRule>) {
  return rule.type === "transfer" ? (
    <RecordTransferOccurrenceForm rule={rule} {...rest} />
  ) : (
    <RecordSimpleOccurrenceForm rule={rule} {...rest} />
  );
}

function RecordSimpleOccurrenceForm({ rule, occurrenceDate, onDone }: OccurrenceProps<SimpleRule>) {
  const today = todayInJakarta();
  const { occurrence, record } = useRecordOccurrence(rule, occurrenceDate, onDone);
  const form = useTransactionForm(occurrenceDefaults(rule, occurrenceDate, today));
  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await record(recurringPostBody(input, occurrence));
    } catch (err) {
      reportSaveError(err, form.setError);
    }
  });

  return (
    // No bottom nav to clear in a modal, so the button sits inline.
    <form onSubmit={onSubmit} noValidate className={formClass}>
      <FixedType type={rule.type} />
      <TransactionFields form={form} type={rule.type} today={today} accountType="transaction" />
      <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
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
  accountType,
}: {
  form: Form;
  type: SimpleTransactionType;
  today: string;
  stored?: Transaction;
  accountType?: "transaction";
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
              accountType={accountType}
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

      <Controller
        control={control}
        name="date"
        render={({ field }) => (
          <FormField id="transaction-date" label="Tanggal" error={errors.date?.message}>
            <DateField
              ref={field.ref}
              id="transaction-date"
              value={field.value}
              onChange={field.onChange}
              min={MIN_TRANSACTION_DATE}
              max={today}
              invalid={!!errors.date}
              describedBy="transaction-date-message"
            />
          </FormField>
        )}
      />

      <FormField
        id="transaction-description"
        label="Deskripsi (opsional)"
        error={errors.description?.message}
      >
        <Input
          id="transaction-description"

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
