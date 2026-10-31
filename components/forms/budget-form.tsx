"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SPENDING_TYPE_LABELS } from "@/components/forms/category-labels";
import { inputClass } from "@/components/forms/field-styles";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createBudget } from "@/hooks/use-budgets";
import { budgetCategoryOptions } from "@/lib/budget-format";
import { applyServerErrors } from "@/lib/form-errors";
import { failureMessage } from "@/lib/offline/network-error";
import { budgetCreateSchema, type BudgetCreateInput } from "@/lib/schemas/budget";
import type { BudgetUsage } from "@/lib/schemas/budget-usage";
import { SPENDING_TYPES, type Category, type SpendingType } from "@/lib/schemas/category";

type BudgetFormProps = {
  categories: Category[];
  /** The current month's usage: which categories other budgets already hold. */
  usage: BudgetUsage;
  onDone: () => void;
};

export function BudgetForm({ categories, usage, onDone }: BudgetFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<BudgetCreateInput>({
    resolver: zodResolver(budgetCreateSchema),
    defaultValues: { name: "", amount: 0, spendingType: "wants", categoryIds: [] },
  });
  const spendingType = useWatch({ control, name: "spendingType" });
  const options = budgetCategoryOptions({ categories, usage, spendingType });
  const label = SPENDING_TYPE_LABELS[spendingType];

  const onSubmit = handleSubmit(async (input) => {
    try {
      await createBudget(input);
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

      <Controller
        control={control}
        name="categoryIds"
        render={({ field }) => (
          <fieldset aria-describedby="budget-categories-message" className="flex flex-col gap-1">
            <legend className="mb-1 text-base font-semibold">Kategori</legend>
            {options.map((option) => {
              const taken = option.status === "taken";
              const checked = field.value.includes(option.id);
              return (
                <label
                  key={option.id}
                  className="flex min-h-11 items-center gap-3 text-base has-disabled:text-muted-foreground"
                >
                  <Checkbox
                    checked={checked}
                    disabled={taken}
                    aria-invalid={!!errors.categoryIds}
                    onCheckedChange={(on) =>
                      field.onChange(
                        on
                          ? [...field.value, option.id]
                          : field.value.filter((id) => id !== option.id),
                      )
                    }
                  />
                  <span className="min-w-0 flex-1 truncate">{option.name}</span>
                  {taken && <span className="shrink-0 truncate text-sm">di {option.takenBy}</span>}
                </label>
              );
            })}
            {(errors.categoryIds || options.every((o) => o.status === "taken")) && (
              <p
                id="budget-categories-message"
                className={
                  errors.categoryIds
                    ? "text-sm leading-snug font-semibold text-destructive"
                    : "text-sm leading-snug text-muted-foreground"
                }
              >
                {errors.categoryIds?.message ??
                  (options.length === 0
                    ? `Belum ada kategori ${label}.`
                    : `Semua kategori ${label} sudah punya budget.`)}
              </p>
            )}
          </fieldset>
        )}
      />
    </form>
  );
}
