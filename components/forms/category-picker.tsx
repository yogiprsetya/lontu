"use client";

import { PlusIcon } from "lucide-react";
import { KIND_LABELS, SPENDING_TYPE_LABELS } from "@/components/forms/category-form";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { archiveLabel, selectableItems } from "@/lib/archived";
import { groupBySpendingType, useCategories } from "@/hooks/use-categories";
import { type Category, type CategoryKind, SPENDING_TYPES } from "@/lib/schemas/category";
import { useUIStore } from "@/stores/ui";

type CategoryPickerProps = {
  id: string;
  kind: CategoryKind;
  /** The stored category of a transaction being edited: still offered, labelled "(arsip)", if archived. */
  keep?: string;
  value: string;
  onChange: (id: string) => void;
  invalid?: boolean;
  describedBy?: string;
};

/** Active categories of one kind; spending is grouped into Needs and Wants. */
export function CategoryPicker({ id, kind, keep, value, onChange, invalid, describedBy }: CategoryPickerProps) {
  const { data: all, error, mutate } = useCategories({ kind, includeArchived: !!keep });
  const data = all && selectableItems(all, keep);
  const open = useUIStore((s) => s.open);

  if (error) return <LoadError onRetry={() => void mutate()} message="Gagal memuat kategori." />;
  if (!data) return <Skeleton className="h-11 w-full" aria-label="Memuat kategori" />;

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed px-4 py-4">
        <p className="text-sm text-muted-foreground">Belum ada kategori {KIND_LABELS[kind]}.</p>
        <Button
          type="button"
          variant="outline"
          className="h-11 text-base"
          onClick={() => open("manageCategories", { kind })}
        >
          <PlusIcon aria-hidden />
          Tambah kategori
        </Button>
      </div>
    );
  }

  const groups = groupBySpendingType(data);

  return (
    <Select
      items={data.map((c) => ({ value: c.id, label: archiveLabel(c) }))}
      value={value || null}
      onValueChange={(v) => v && onChange(v)}
    >
      <SelectTrigger
        id={id}
        className="w-full text-base data-[size=default]:h-11 md:text-sm"
        aria-invalid={invalid}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder="Pilih kategori" />
      </SelectTrigger>
      <SelectContent>
        {kind === "spending"
          ? SPENDING_TYPES.map(
              (type) =>
                groups[type].length > 0 && (
                  <SelectGroup key={type}>
                    <SelectLabel>{SPENDING_TYPE_LABELS[type]}</SelectLabel>
                    <CategoryItems categories={groups[type]} />
                  </SelectGroup>
                ),
            )
          : <CategoryItems categories={data} />}
      </SelectContent>
    </Select>
  );
}

function CategoryItems({ categories }: { categories: Category[] }) {
  return categories.map((c) => (
    <SelectItem key={c.id} value={c.id} className="min-h-11">
      {archiveLabel(c)}
    </SelectItem>
  ));
}
