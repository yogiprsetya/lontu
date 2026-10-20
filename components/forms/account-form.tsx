"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { FormField } from "@/components/forms/form-field";
import { MoneyInput } from "@/components/forms/money-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createAccount } from "@/hooks/use-accounts";
import { applyServerErrors } from "@/lib/form-errors";
import {
  ACCOUNT_SUBTYPE_LABELS,
  ACCOUNT_SUBTYPES,
  ACCOUNT_TYPE_LABELS,
  ACCOUNT_TYPES,
  type AccountCreateInput,
  type AccountType,
  accountCreateSchema,
} from "@/lib/schemas/account";

type FormValues = z.input<typeof accountCreateSchema>;

const subtypeItems = [
  { value: null, label: "Tanpa subjenis" },
  ...ACCOUNT_SUBTYPES.map((value) => ({ value, label: ACCOUNT_SUBTYPE_LABELS[value] })),
];

export function AccountForm({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues, unknown, AccountCreateInput>({
    resolver: zodResolver(accountCreateSchema),
    defaultValues: { name: "", type: "transaction", subtype: null, initialBalance: 0 },
  });

  const onSubmit = handleSubmit(async (input) => {
    try {
      await createAccount(input);
      toast.success("Akun ditambahkan");
      onDone();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error("Gagal menyimpan akun. Coba lagi.");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 pb-4">
      <FormField id="account-name" label="Nama akun" error={errors.name?.message}>
        <Input
          id="account-name"
          className="h-11"
          autoComplete="off"
          placeholder="mis. BCA, GoPay"
          aria-invalid={!!errors.name}
          aria-describedby="account-name-message"
          {...register("name")}
        />
      </FormField>

      <Controller
        control={control}
        name="type"
        render={({ field }) => (
          <div role="group" aria-labelledby="account-type-label" className="flex flex-col gap-2">
            <span id="account-type-label" className="text-sm font-medium">
              Jenis
            </span>
            <ToggleGroup
              variant="outline"
              spacing={0}
              className="grid w-full grid-cols-2"
              value={[field.value]}
              onValueChange={(next) => next[0] && field.onChange(next[0] as AccountType)}
            >
              {ACCOUNT_TYPES.map((type) => (
                <ToggleGroupItem key={type} value={type} className="h-11 text-base">
                  {ACCOUNT_TYPE_LABELS[type]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        )}
      />

      <Controller
        control={control}
        name="subtype"
        render={({ field }) => (
          <FormField id="account-subtype" label="Subjenis (opsional)" error={errors.subtype?.message}>
            <Select items={subtypeItems} value={field.value ?? null} onValueChange={(v) => field.onChange(v)}>
              <SelectTrigger id="account-subtype" className="w-full text-base data-[size=default]:h-11 md:text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subtypeItems.map((item) => (
                  <SelectItem key={item.value ?? "none"} value={item.value} className="min-h-11">
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
        )}
      />

      <Controller
        control={control}
        name="initialBalance"
        render={({ field }) => (
          <FormField
            id="account-initial-balance"
            label="Saldo awal"
            error={errors.initialBalance?.message}
            hint="Boleh minus, mis. untuk kartu kredit."
          >
            <MoneyInput
              id="account-initial-balance"
              allowNegative
              value={field.value ?? 0}
              onChange={field.onChange}
              onBlur={field.onBlur}
              invalid={!!errors.initialBalance}
              describedBy="account-initial-balance-message"
            />
          </FormField>
        )}
      />

      <div className="sticky bottom-0 flex gap-2 bg-popover pt-2">
        <Button type="button" variant="outline" className="h-11 flex-1 text-base" onClick={onCancel}>
          Batal
        </Button>
        <Button type="submit" className="h-11 flex-1 text-base" disabled={isSubmitting}>
          {isSubmitting && <Loader2Icon className="animate-spin" aria-hidden />}
          Simpan
        </Button>
      </div>
    </form>
  );
}
