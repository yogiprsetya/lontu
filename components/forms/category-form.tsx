"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createCategory } from "@/hooks/use-categories";
import { applyServerErrors } from "@/lib/form-errors";
import { type CategoryKind, SPENDING_TYPES, type SpendingType, categoryRenameSchema } from "@/lib/schemas/category";

export const KIND_LABELS: Record<CategoryKind, string> = { income: "Income", saving: "Saving", spending: "Spending" };
export const SPENDING_TYPE_LABELS: Record<SpendingType, string> = { needs: "Needs", wants: "Wants" };

// The kind comes from the active tab, so the form only edits name and, for spending, needs/wants.
const formSchema = z.object({ name: categoryRenameSchema.shape.name, spendingType: z.enum(SPENDING_TYPES) });
type FormValues = z.infer<typeof formSchema>;

type CategoryFormProps = { kind: CategoryKind; onDone: () => void; onCancel: () => void };

export function CategoryForm({ kind, onDone, onCancel }: CategoryFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: { name: "", spendingType: "needs" } });

  const onSubmit = handleSubmit(async ({ name, spendingType }) => {
    try {
      await createCategory(kind === "spending" ? { name, kind, spendingType } : { name, kind, spendingType: null });
      toast.success("Kategori ditambahkan");
      onDone();
    } catch (err) {
      if (!applyServerErrors(err, setError)) toast.error("Gagal menyimpan kategori. Coba lagi.");
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 pb-4">
      <p className="text-sm text-muted-foreground">Jenis: {KIND_LABELS[kind]}</p>
      <FormField id="category-name" label="Nama kategori" error={errors.name?.message}>
        <Input
          id="category-name"
          className="h-11"
          autoComplete="off"
          aria-invalid={!!errors.name}
          aria-describedby="category-name-message"
          {...register("name")}
        />
      </FormField>

      {kind === "spending" && (
        <Controller
          control={control}
          name="spendingType"
          render={({ field }) => (
            <div role="group" aria-labelledby="category-spending-type-label" className="flex flex-col gap-2">
              <span id="category-spending-type-label" className="text-sm font-medium">
                Kebutuhan atau keinginan
              </span>
              <ToggleGroup
                variant="outline"
                spacing={0}
                className="grid w-full grid-cols-2"
                value={[field.value]}
                onValueChange={(next) => next[0] && field.onChange(next[0] as SpendingType)}
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
