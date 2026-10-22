"use client";

import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { AccountPicker } from "@/components/forms/account-picker";
import { CategoryPicker } from "@/components/forms/category-picker";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAccounts } from "@/hooks/use-accounts";
import { createTransaction } from "@/hooks/use-transactions";
import { todayInJakarta } from "@/lib/date";
import { applyServerErrors } from "@/lib/form-errors";
import { formatIDR } from "@/lib/money";
import { CATEGORY_KIND_FOR } from "@/lib/schemas/category";
import {
  MIN_TRANSACTION_DATE,
  type SimpleCreateInput,
  type SimpleTransactionType,
  simpleCreateSchema,
} from "@/lib/schemas/transaction";
import { balanceAfter } from "@/lib/transaction-balance";
import { TRANSACTION_TYPE_LABELS } from "@/lib/transaction-types";
import { useUIStore } from "@/stores/ui";

type FormValues = z.input<typeof simpleCreateSchema>;

/** Income, expense or saving. Waits for the server, then goes to the list. */
export function TransactionForm({ type }: { type: SimpleTransactionType }) {
  const router = useRouter();
  const today = todayInJakarta();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, SimpleCreateInput>({
    resolver: zodResolver(simpleCreateSchema),
    defaultValues: { type, amount: 0, date: today, accountId: "", categoryId: "", description: "" },
  });
  const [accountId, amount] = useWatch({ control, name: ["accountId", "amount"] });
  const warning = useShortBalanceWarning(accountId, type === "income" ? amount : -amount);

  const onSubmit = handleSubmit(async (input) => {
    try {
      await createTransaction(input);
      toast.success(`${TRANSACTION_TYPE_LABELS[type]} tersimpan`);
      router.push("/transactions");
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error("Gagal menyimpan transaksi. Coba lagi.");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
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

      <Button type="submit" className="mt-2 h-11 text-base" disabled={isSubmitting}>
        {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
        Simpan
      </Button>
    </form>
  );
}

/** Non-blocking: the server accepts negative balances. */
function useShortBalanceWarning(accountId: string, effect: number) {
  const { data } = useAccounts();
  const hideAmounts = useUIStore((s) => s.hideAmounts);
  const account = data?.find((a) => a.id === accountId);
  if (!account) return undefined;

  const { after, short } = balanceAfter({ balance: account.balance, subtype: account.subtype, effect });
  if (!short) return undefined;
  return (
    <span className="text-expense">
      {hideAmounts
        ? `Saldo ${account.name} tidak cukup.`
        : `Saldo ${account.name} ${formatIDR(account.balance)} tidak cukup, akan menjadi ${formatIDR(after)}.`}
    </span>
  );
}
