"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { AccountPicker } from "@/components/forms/account-picker";
import { CategoryPicker } from "@/components/forms/category-picker";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { TYPE_STYLES } from "@/components/transactions/type-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createRule, updateRule } from "@/hooks/use-recurring";
import { applyServerErrors } from "@/lib/form-errors";
import { failureMessage } from "@/lib/offline/network-error";
import { paydayHint, reschedulesMissed, ruleFormDefaults, type RulePreset, toUpdateInput } from "@/lib/recurring-form";
import { RECURRING_GROUPS } from "@/lib/recurring-format";
import { CATEGORY_KIND_FOR } from "@/lib/schemas/category";
import {
  type RecurringCreateInput,
  type RecurringRule,
  type RecurringType,
  recurringCreateSchema,
} from "@/lib/schemas/recurring";

type FormValues = z.input<typeof recurringCreateSchema>;

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

type RecurringFormProps = {
  /** Edit this rule; omit to create one. */
  rule?: RecurringRule;
  preset?: RulePreset;
  /** The active payday rule, to warn before its flag moves. */
  currentPayday?: RecurringRule;
  today: string;
  onDone: () => void;
};

export function RecurringForm({ rule, preset, currentPayday, today, onDone }: RecurringFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<FormValues, unknown, RecurringCreateInput>({
    resolver: zodResolver(recurringCreateSchema),
    defaultValues: ruleFormDefaults({ rule, preset }),
  });
  const [type, dayOfMonth, isPayday] = useWatch({ control, name: ["type", "dayOfMonth", "isPayday"] });

  const onSubmit = handleSubmit(async (input) => {
    try {
      if (rule) {
        await updateRule(rule.id, toUpdateInput(input));
        toast.success("Aturan diperbarui");
      } else {
        await createRule(input);
        toast.success("Aturan ditambahkan");
      }
      onDone();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error(failureMessage(err, "Gagal menyimpan aturan. Coba lagi."));
    }
  });

  function changeType(next: RecurringType) {
    setValue("type", next);
    // The category kind follows the type, and only income can be payday.
    setValue("categoryId", "");
    if (next !== "income") setValue("isPayday", false);
  }

  return (
    <form id="recurring-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {rule ? (
        <p className="text-sm text-muted-foreground">
          Jenis:{" "}
          <span className="font-medium text-foreground">{RECURRING_GROUPS.find((g) => g.type === rule.type)?.label}</span> (tidak
          bisa diubah)
        </p>
      ) : (
        <div role="group" aria-labelledby="recurring-type-label" className="flex flex-col gap-2">
          <span id="recurring-type-label" className="text-sm font-medium">
            Jenis
          </span>
          <ToggleGroup
            variant="outline"
            spacing={0}
            className="grid w-full grid-cols-3"
            value={[type]}
            onValueChange={(next) => next[0] && changeType(next[0] as RecurringType)}
          >
            {RECURRING_GROUPS.map(({ type: value, label }) => {
              const { icon: Icon } = TYPE_STYLES[value];
              return (
                <ToggleGroupItem key={value} value={value} className="h-11 gap-1.5 text-base">
                  <Icon className="size-4" aria-hidden />
                  {label}
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </div>
      )}

      <FormField id="recurring-name" label="Nama" error={errors.name?.message}>
        <Input
          id="recurring-name"
          className="h-11"
          autoComplete="off"
          maxLength={60}
          placeholder={type === "income" ? "mis. Gaji" : type === "saving" ? "mis. Dana darurat" : "mis. Netflix, Sewa"}
          aria-invalid={!!errors.name}
          aria-describedby="recurring-name-message"
          {...register("name")}
        />
      </FormField>

      <Controller
        control={control}
        name="amount"
        render={({ field }) => (
          <FormField id="recurring-amount" label="Nominal" error={errors.amount?.message}>
            <MoneyInput
              id="recurring-amount"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={!!errors.amount}
              describedBy="recurring-amount-message"
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="accountId"
        render={({ field }) => (
          <FormField id="recurring-account" label="Akun" error={errors.accountId?.message}>
            <AccountPicker
              id="recurring-account"
              value={field.value}
              onChange={field.onChange}
              keep={rule?.accountId}
              invalid={!!errors.accountId}
              describedBy="recurring-account-message"
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="categoryId"
        render={({ field }) => (
          <FormField id="recurring-category" label="Kategori" error={errors.categoryId?.message}>
            <CategoryPicker
              key={type}
              id="recurring-category"
              kind={CATEGORY_KIND_FOR[type]}
              keep={rule?.categoryId}
              value={field.value}
              onChange={field.onChange}
              invalid={!!errors.categoryId}
              describedBy="recurring-category-message"
            />
          </FormField>
        )}
      />

      <FormField
        id="recurring-day"
        label="Tanggal tiap bulan"
        error={errors.dayOfMonth?.message}
        hint={
          reschedulesMissed(rule, Number(dayOfMonth), today)
            ? "Aturan ini terlambat. Mengubah tanggal melewati kejadian yang tertinggal; jatuh tempo dihitung ulang dari hari ini."
            : "Bulan yang lebih pendek memakai hari terakhirnya."
        }
      >
        <select
          id="recurring-day"
          className="h-11 w-full rounded-md border border-input bg-transparent px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive dark:bg-input/30"
          aria-invalid={!!errors.dayOfMonth}
          aria-describedby="recurring-day-message"
          {...register("dayOfMonth", { valueAsNumber: true })}
        >
          {DAYS.map((day) => (
            <option key={day} value={day}>
              Tanggal {day}
            </option>
          ))}
        </select>
      </FormField>

      {type === "income" && (
        <Controller
          control={control}
          name="isPayday"
          render={({ field }) => (
            <div className="flex flex-col gap-1">
              <Label htmlFor="recurring-payday" className="flex min-h-11 cursor-pointer items-center justify-between gap-3 text-base font-normal">
                Ini gaji saya
                <Switch
                  id="recurring-payday"
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  aria-describedby="recurring-payday-message"
                />
              </Label>
              <p id="recurring-payday-message" className={errors.isPayday ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
                {errors.isPayday?.message ??
                  paydayHint(!!isPayday, currentPayday, rule?.id) ??
                  "Dipakai untuk menghitung berapa yang bebas sampai gajian."}
              </p>
            </div>
          )}
        />
      )}
    </form>
  );
}
