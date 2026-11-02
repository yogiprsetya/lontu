"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { fieldMessageClass, inputClass } from "@/components/forms/field-styles";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAccounts } from "@/hooks/use-accounts";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { createGoal, useGoals } from "@/hooks/use-goals";
import { todayInJakarta } from "@/lib/date";
import { applyServerErrors } from "@/lib/form-errors";
import { goalAccountOptions, type GoalAccountOption } from "@/lib/goal-format";
import { failureMessage } from "@/lib/offline/network-error";
import { type GoalCreateInput, goalCreateSchema } from "@/lib/schemas/goal";

type FormValues = z.input<typeof goalCreateSchema>;

const ACCOUNTS_MESSAGE_ID = "goal-accounts-message";

function AccountChecklist({
  options,
  value,
  onChange,
  error,
}: {
  options: GoalAccountOption[];
  value: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const money = useAmountFormat();
  const message =
    error ?? (options.length === 0 ? "Belum ada akun yang bisa dipakai target." : undefined);
  return (
    <fieldset
      aria-describedby={message ? ACCOUNTS_MESSAGE_ID : undefined}
      className="flex flex-col gap-1"
    >
      <legend className="mb-1 text-base font-semibold">Akun yang dihitung</legend>
      {/* Bounded so a long list scrolls here instead of pushing the modal's footer off screen. */}
      <div className="-mx-1 max-h-[min(16rem,40dvh)] overflow-y-auto overscroll-contain px-1">
        {options.map((option) => (
          <label
            key={option.id}
            className="flex min-h-11 items-center gap-3 text-base has-disabled:text-muted-foreground"
          >
            <Checkbox
              checked={value.includes(option.id)}
              disabled={!!option.takenBy}
              aria-invalid={!!error}
              onCheckedChange={(on) =>
                onChange(on ? [...value, option.id] : value.filter((id) => id !== option.id))
              }
            />
            <span className="min-w-0 flex-1 truncate">{option.name}</span>
            <span className="shrink-0 truncate text-sm">
              {option.takenBy ? `Dipakai ${option.takenBy}` : money(option.balance)}
            </span>
          </label>
        ))}
      </div>
      {message && (
        <p id={ACCOUNTS_MESSAGE_ID} className={fieldMessageClass(!!error)}>
          {message}
        </p>
      )}
    </fieldset>
  );
}

export function GoalForm({ onDone }: { onDone: () => void }) {
  const accounts = useAccounts();
  const goals = useGoals();
  const thisMonth = todayInJakarta().slice(0, 7);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues, unknown, GoalCreateInput>({
    resolver: zodResolver(goalCreateSchema),
    defaultValues: { name: "", targetAmount: 0, targetMonth: null, accountIds: [] },
  });

  const onSubmit = handleSubmit(async (input) => {
    try {
      await createGoal(input);
      toast.success("Target ditambahkan");
      onDone();
    } catch (err) {
      if (!applyServerErrors(err, setError))
        toast.error(failureMessage(err, "Gagal menyimpan target. Coba lagi."));
    }
  });

  const options = goalAccountOptions(accounts.data ?? [], goals.data ?? []);

  return (
    <form id="goal-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4 pb-2">
      <FormField id="goal-name" label="Nama" error={errors.name?.message}>
        <Input
          id="goal-name"
          className={inputClass}
          autoComplete="off"
          maxLength={60}
          placeholder="mis. DP Rumah, Dana Darurat"
          aria-invalid={!!errors.name}
          aria-describedby="goal-name-message"
          {...register("name")}
        />
      </FormField>

      <Controller
        control={control}
        name="targetAmount"
        render={({ field }) => (
          <FormField id="goal-amount" label="Nominal target" error={errors.targetAmount?.message}>
            <MoneyInput
              id="goal-amount"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={!!errors.targetAmount}
              describedBy="goal-amount-message"
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="targetMonth"
        render={({ field }) => (
          <FormField
            id="goal-month"
            label="Bulan target (opsional)"
            error={errors.targetMonth?.message}
            hint="Tanpa bulan target, kartu menampilkan perkiraan kapan tercapai."
          >
            <div className="flex gap-2">
              <Input
                id="goal-month"
                type="month"
                className={inputClass}
                min={thisMonth}
                placeholder="YYYY-MM"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                onBlur={field.onBlur}
                aria-invalid={!!errors.targetMonth}
                aria-describedby="goal-month-message"
              />
              {field.value && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11 shrink-0"
                  aria-label="Hapus bulan target"
                  onClick={() => field.onChange(null)}
                >
                  <XIcon aria-hidden />
                </Button>
              )}
            </div>
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="accountIds"
        render={({ field }) => (
          <AccountChecklist
            options={options}
            value={field.value}
            onChange={field.onChange}
            error={errors.accountIds?.message}
          />
        )}
      />
    </form>
  );
}
