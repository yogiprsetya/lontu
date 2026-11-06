"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { XIcon } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { fieldMessageClass } from "@/components/forms/field-styles";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAccounts } from "@/hooks/use-accounts";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { createNetWorth, updateNetWorth, useNetWorths } from "@/hooks/use-net-worth";
import { todayInJakarta } from "@/lib/date";
import { applyServerErrors } from "@/lib/form-errors";
import {
  netWorthAccountOptions,
  netWorthChanges,
  type NetWorthAccountOption,
} from "@/lib/net-worth-format";
import { failureMessage } from "@/lib/offline/network-error";
import {
  type NetWorth,
  type NetWorthCreateInput,
  netWorthCreateSchema,
  netWorthEditSchema,
} from "@/lib/schemas/net-worth";

type FormValues = z.input<typeof netWorthCreateSchema>;

const ACCOUNTS_MESSAGE_ID = "net-worth-accounts-message";

function AccountChecklist({
  options,
  value,
  onChange,
  error,
}: {
  options: NetWorthAccountOption[];
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

type NetWorthFormProps = {
  /** Edit this net worth; omit to create one. */
  netWorth?: NetWorth;
  onDone: () => void;
};

export function NetWorthForm({ netWorth, onDone }: NetWorthFormProps) {
  // Archived accounts the net worth already counts stay listed (SPEC-net-worth #15).
  const accounts = useAccounts({ includeArchived: true });
  const netWorths = useNetWorths();
  const thisMonth = todayInJakarta().slice(0, 7);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues, unknown, NetWorthCreateInput>({
    resolver: zodResolver(
      netWorth ? netWorthEditSchema(netWorth.targetMonth) : netWorthCreateSchema,
    ),
    defaultValues: netWorth
      ? {
          name: netWorth.name,
          targetAmount: netWorth.targetAmount,
          targetMonth: netWorth.targetMonth,
          accountIds: netWorth.accountIds,
        }
      : { name: "", targetAmount: 0, targetMonth: null, accountIds: [] },
  });

  const onSubmit = handleSubmit(async (input) => {
    try {
      if (netWorth) {
        const changes = netWorthChanges(netWorth, input);
        if (Object.keys(changes).length > 0) {
          await updateNetWorth(netWorth.id, changes);
          toast.success("Target diperbarui");
        }
      } else {
        await createNetWorth(input);
        toast.success("Target ditambahkan");
      }
      onDone();
    } catch (err) {
      if (!applyServerErrors(err, setError))
        toast.error(failureMessage(err, "Gagal menyimpan target. Coba lagi."));
    }
  });

  const options = netWorthAccountOptions(accounts.data ?? [], netWorths.data ?? [], netWorth);

  return (
    <form id="net-worth-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4 pb-2">
      <FormField id="net-worth-name" label="Nama" error={errors.name?.message}>
        <Input
          id="net-worth-name"

          autoComplete="off"
          maxLength={60}
          placeholder="mis. DP Rumah, Dana Darurat"
          aria-invalid={!!errors.name}
          aria-describedby="net-worth-name-message"
          {...register("name")}
        />
      </FormField>

      <Controller
        control={control}
        name="targetAmount"
        render={({ field }) => (
          <FormField
            id="net-worth-amount"
            label="Nominal target"
            error={errors.targetAmount?.message}
          >
            <MoneyInput
              id="net-worth-amount"
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={!!errors.targetAmount}
              describedBy="net-worth-amount-message"
            />
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="targetMonth"
        render={({ field }) => (
          <FormField
            id="net-worth-month"
            label="Bulan target (opsional)"
            error={errors.targetMonth?.message}
            hint="Tanpa bulan target, kartu menampilkan perkiraan kapan tercapai."
          >
            <div className="flex gap-2">
              <Input
                id="net-worth-month"
                type="month"

                min={thisMonth}
                placeholder="YYYY-MM"
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
                onBlur={field.onBlur}
                aria-invalid={!!errors.targetMonth}
                aria-describedby="net-worth-month-message"
              />
              {field.value && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
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
