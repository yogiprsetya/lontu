"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { BudgetCategoryPicker } from "@/components/forms/budget-category-picker";
import { BudgetDeleteButton } from "@/components/forms/budget-delete-button";
import { SPENDING_TYPE_LABELS } from "@/components/forms/category-labels";
import { inputClass } from "@/components/forms/field-styles";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createBudget, updateBudget } from "@/hooks/use-budgets";
import { budgetCategoryOptions, budgetPatch } from "@/lib/budget-format";
import { applyServerErrors } from "@/lib/form-errors";
import { failureMessage } from "@/lib/offline/network-error";
import { budgetCreateSchema, type BudgetCreateInput } from "@/lib/schemas/budget";
import type { BudgetUsage, BudgetUsageItem } from "@/lib/schemas/budget-usage";
import { SPENDING_TYPES, type Category, type SpendingType } from "@/lib/schemas/category";

type BudgetFormProps = {
  categories: Category[];
  /** The current month's usage: which categories other budgets already hold. */
  usage: BudgetUsage;
  /** Edit this budget's current version; omit to create one. */
  budget?: BudgetUsageItem;
  onDone: () => void;
};

export function BudgetForm({ categories, usage, budget, onDone }: BudgetFormProps) {
  const initial = budget && {
    name: budget.name,
    amount: budget.budget,
    categoryIds: budget.categories.map((c) => c.categoryId),
  };
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BudgetCreateInput>({
    resolver: zodResolver(budgetCreateSchema),
    defaultValues: initial
      ? { ...initial, spendingType: budget.spendingType }
      : { name: "", amount: 0, spendingType: "wants", categoryIds: [] },
  });
  const spendingType = useWatch({ control, name: "spendingType" });
  const options = budgetCategoryOptions({
    categories,
    usage,
    budgetId: budget?.budgetId,
    spendingType,
  });
  const label = SPENDING_TYPE_LABELS[spendingType];

  const onSubmit = handleSubmit(async (input) => {
    try {
      if (budget && initial) {
        const patch = budgetPatch(initial, input);
        if (Object.keys(patch).length > 0) await updateBudget(budget.budgetId, patch);
      } else {
        await createBudget(input);
      }
      toast.success("Budget disimpan");
      onDone();
    } catch (err) {
      if (!applyServerErrors(err, setError))
        toast.error(failureMessage(err, "Gagal menyimpan budget. Coba lagi."));
    }
  });

  return (
    <form id="budget-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <FormField id="budget-name" label="Nama budget" error={errors.name?.message}>
        <Input
          id="budget-name"
          className={inputClass}
          autoComplete="off"
          placeholder="mis. Jajan & Hiburan"
          aria-invalid={!!errors.name}
          aria-describedby="budget-name-message"
          {...register("name")}
        />
      </FormField>

      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <FormField
            id="budget-amount"
            label="Nominal per bulan"
            error={errors.amount?.message}
            hint="Berlaku mulai bulan ini sampai diubah. Rp0 berarti tidak boleh belanja."
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

      {budget ? (
        <p className="text-sm text-muted-foreground">
          Jenis: {label}. Jenis budget tidak bisa diubah.
        </p>
      ) : (
        <Controller
          control={control}
          name="spendingType"
          render={({ field }) => (
            <div role="group" aria-labelledby="budget-type-label" className="flex flex-col gap-2">
              <span id="budget-type-label" className="text-base font-semibold">
                Kebutuhan atau keinginan
              </span>
              <ToggleGroup
                variant="outline"
                spacing={0}
                className="grid w-full grid-cols-2"
                value={[field.value]}
                onValueChange={(next) => {
                  const type = next[0] as SpendingType | undefined;
                  if (!type || type === field.value) return;
                  field.onChange(type);
                  // A budget never mixes types, so picks of the other type are dropped.
                  setValue("categoryIds", []);
                }}
              >
                {SPENDING_TYPES.map((type) => (
                  <ToggleGroupItem key={type} value={type} className="h-11 text-base">
                    {SPENDING_TYPE_LABELS[type]}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>
          )}
        />
      )}

      <Controller
        control={control}
        name="categoryIds"
        render={({ field }) => (
          <BudgetCategoryPicker
            options={options}
            value={field.value}
            onChange={field.onChange}
            error={errors.categoryIds?.message}
            typeLabel={label}
          />
        )}
      />

      {budget && (
        <BudgetDeleteButton
          period={usage.period}
          budgetId={budget.budgetId}
          disabled={isSubmitting}
          onDone={onDone}
        />
      )}
    </form>
  );
}
