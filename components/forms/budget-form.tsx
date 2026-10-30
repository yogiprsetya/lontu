"use client";

import Link from "next/link";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { Button, buttonVariants } from "@/components/ui/button";
import { deleteBudget, restoreBudget, setBudgets } from "@/hooks/use-budgets";
import { budgetTransactionsHref } from "@/lib/budget-format";
import { applyServerErrors } from "@/lib/form-errors";
import { budgetAmount, type BudgetPeriod, type BudgetUsageItem } from "@/lib/schemas/budget";
import { cn } from "@/lib/utils";
import { failureMessage } from "@/lib/offline/network-error";
import { undoToast } from "@/lib/undo-toast";

const formSchema = z.object({ amount: budgetAmount });

type FormValues = z.infer<typeof formSchema>;

type BudgetFormProps = {
  period: BudgetPeriod;
  item: BudgetUsageItem;
  onDone: () => void;
};

export function BudgetForm({ period, item, onDone }: BudgetFormProps) {
  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { amount: item.budget ?? 0 },
  });

  const onSubmit = handleSubmit(async ({ amount }) => {
    try {
      await setBudgets({
        period,
        items: [{ categoryId: item.categoryId, amount }],
      });
      toast.success("Budget disimpan");
      onDone();
    } catch (err) {
      // The API reports problems on `period` or `items`; this form has one field to show them on.
      if (!applyServerErrors(err, (_name: never, error) => setError("amount", error))) {
        toast.error(failureMessage(err, "Gagal menyimpan budget. Coba lagi."));
      }
    }
  });

  // The row clears at once (optimistic), so the modal closes before the server answers.
  async function onDelete(id: string) {
    onDone();
    try {
      await deleteBudget(period, id);
      undoToast({ message: "Budget dihapus", restore: () => restoreBudget(id) });
    } catch (err) {
      toast.error(failureMessage(err, "Gagal menghapus budget. Coba lagi."));
    }
  }

  return (
    <form id="budget-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <FormField
            id="budget-amount"
            label="Budget bulan ini"
            error={errors.amount?.message}
            hint="Rp0 berarti tidak boleh ada pengeluaran di kategori ini."
          >
            <MoneyInput
              id="budget-amount"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={!!errors.amount}
              describedBy="budget-amount-message"
            />
          </FormField>
        )}
      />

      <Link
        href={budgetTransactionsHref(period, item.categoryId)}
        className={cn(buttonVariants({ variant: "outline" }), "h-11 self-start text-base")}
      >
        Lihat transaksi
      </Link>

      {item.budgetId && (
        <Button
          type="button"
          variant="outline"
          className="h-11 text-base text-destructive"
          disabled={isSubmitting}
          onClick={() => void onDelete(item.budgetId!)}
        >
          Hapus budget
        </Button>
      )}
    </form>
  );
}
