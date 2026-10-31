"use client";

import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createCategory, renameCategory } from "@/hooks/use-categories";
import { applyServerErrors } from "@/lib/form-errors";
import { KIND_LABELS, SPENDING_TYPE_LABELS } from "@/components/forms/category-labels";
import {
  type Category,
  type CategoryKind,
  SPENDING_TYPES,
  type SpendingType,
  categoryRenameSchema,
} from "@/lib/schemas/category";
import { failureMessage } from "@/lib/offline/network-error";
import { inputClass } from "@/components/forms/field-styles";

// The kind comes from the active tab, so the form only edits name and, for spending, needs/wants.
const formSchema = z.object({
  name: categoryRenameSchema.shape.name,
  spendingType: z.enum(SPENDING_TYPES),
});
type FormValues = z.infer<typeof formSchema>;

type CategoryFormProps = {
  kind: CategoryKind;
  /** Rename this category; omit to create one. */
  category?: Category;
  onDone: () => void;
  /** Extra actions for edit mode, rendered above Batal/Simpan. */
  children?: React.ReactNode;
};

export function CategoryForm({ kind, category, onDone, children }: CategoryFormProps) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: category?.name ?? "", spendingType: category?.spendingType ?? "needs" },
  });

  const onSubmit = handleSubmit(async ({ name, spendingType }) => {
    try {
      if (category) {
        await renameCategory(category.id, name);
        toast.success("Kategori diperbarui");
      } else {
        await createCategory(
          kind === "spending" ? { name, kind, spendingType } : { name, kind, spendingType: null },
        );
        toast.success("Kategori ditambahkan");
      }
      onDone();
    } catch (err) {
      if (!applyServerErrors(err, setError))
        toast.error(failureMessage(err, "Gagal menyimpan kategori. Coba lagi."));
    }
  });

  return (
    <form id="category-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Jenis: {KIND_LABELS[kind]}
        {category?.spendingType && ` · ${SPENDING_TYPE_LABELS[category.spendingType]}`}
        {category && ". Jenis kategori tidak bisa diubah."}
      </p>
      <FormField id="category-name" label="Nama kategori" error={errors.name?.message}>
        <Input
          id="category-name"
          className={inputClass}
          autoComplete="off"
          aria-invalid={!!errors.name}
          aria-describedby="category-name-message"
          {...register("name")}
        />
      </FormField>

      {kind === "spending" && !category && (
        <Controller
          control={control}
          name="spendingType"
          render={({ field }) => (
            <div
              role="group"
              aria-labelledby="category-spending-type-label"
              className="flex flex-col gap-2"
            >
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

      {children}
    </form>
  );
}
