"use client";

import { useState } from "react";
import { SlidersHorizontalIcon } from "lucide-react";
import { KIND_LABELS } from "@/components/forms/category-form";
import { ResponsiveModal } from "@/components/layout/responsive-modal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { selectTriggerClass, selectItemClass } from "@/components/forms/field-styles";
import { useAccounts } from "@/hooks/use-accounts";
import { useCategories } from "@/hooks/use-categories";
import { archiveLabel } from "@/lib/archived";
import {
  CATEGORY_KINDS,
  CATEGORY_KIND_FOR,
  type Category,
} from "@/lib/schemas/category";
import {
  LIST_TRANSACTION_TYPES,
  type ListTransactionType,
} from "@/lib/schemas/transaction";
import {
  countActiveFilters,
  normalizeFilters,
  resetFilters,
  type ListFilters,
} from "@/lib/transaction-filters";
import {
  ADJUSTMENT_LABEL,
  TRANSACTION_TYPE_LABELS,
  type TransactionType,
} from "@/lib/transaction-types";

const ALL = "all";

const typeLabel = (type: ListTransactionType) =>
  type === "adjustment" ? ADJUSTMENT_LABEL : TRANSACTION_TYPE_LABELS[type];

function Field({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id} className="text-base font-semibold">{label}</Label>
      {children}
    </div>
  );
}

type FilterPanelProps = {
  filters: ListFilters;
  onChange: (next: ListFilters) => void;
  /** Hides the Jenis select; the page is a preset for one type. */
  lockedType?: ListTransactionType;
};

export function FilterPanel({
  filters,
  onChange,
  lockedType,
}: FilterPanelProps) {
  const [open, setOpen] = useState(false);
  const accounts = useAccounts({ includeArchived: true });
  const categories = useCategories({ includeArchived: true });
  const active = countActiveFilters(
    lockedType ? { ...filters, type: undefined } : filters,
  );

  const kindOf = (id: string) =>
    categories.data?.find((c) => c.id === id)?.kind;
  const set = (patch: Partial<ListFilters>) =>
    onChange(normalizeFilters({ ...filters, ...patch }, kindOf, lockedType));

  const types = [
    { value: ALL, label: "Semua jenis" },
    ...LIST_TRANSACTION_TYPES.map((t) => ({ value: t, label: typeLabel(t) })),
  ];
  const accountItems = [
    { value: ALL, label: "Semua akun" },
    ...(accounts.data ?? []).map((a) => ({
      value: a.id,
      label: archiveLabel(a),
    })),
  ];
  const takesCategory =
    !filters.type ||
    (filters.type !== "transfer" && filters.type !== "adjustment");
  const allowedKind =
    takesCategory && filters.type
      ? CATEGORY_KIND_FOR[filters.type as Exclude<TransactionType, "transfer">]
      : undefined;
  const categoryList = (categories.data ?? []).filter(
    (c) => !allowedKind || c.kind === allowedKind,
  );
  const categoryItems = [
    { value: ALL, label: "Semua kategori" },
    ...categoryList.map((c) => ({ value: c.id, label: archiveLabel(c) })),
  ];

  return (
    <>
      <Button
        variant="outline"
        className="h-11 text-base"
        onClick={() => setOpen(true)}
      >
        <SlidersHorizontalIcon aria-hidden />
        Filter
        {active > 0 && (
          <span
            className="grid size-6 place-items-center rounded-full bg-primary text-sm text-primary-foreground"
            aria-label={`${active} filter aktif`}
          >
            {active}
          </span>
        )}
      </Button>

      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title="Filter transaksi"
        footer={
          <>
            <Button
              variant="outline"
              className="h-11 text-base"
              disabled={active === 0}
              onClick={() =>
                onChange(
                  normalizeFilters(resetFilters(filters), kindOf, lockedType),
                )
              }
            >
              Reset
            </Button>
            <Button className="h-11 text-base" onClick={() => setOpen(false)}>
              Selesai
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {!lockedType && (
            <Field id="filter-type" label="Jenis">
              <Select
                items={types}
                value={filters.type ?? ALL}
                onValueChange={(v) =>
                  v &&
                  set({
                    type: v === ALL ? undefined : (v as ListTransactionType),
                  })
                }
              >
                <SelectTrigger id="filter-type" className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem
                      key={t.value}
                      value={t.value}
                      className={selectItemClass}
                    >
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <Field id="filter-account" label="Akun">
            <Select
              items={accountItems}
              value={filters.accountId ?? ALL}
              onValueChange={(v) =>
                v && set({ accountId: v === ALL ? undefined : v })
              }
            >
              <SelectTrigger id="filter-account" className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountItems.map((a) => (
                  <SelectItem
                    key={a.value}
                    value={a.value}
                    className={selectItemClass}
                  >
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {takesCategory && (
            <Field id="filter-category" label="Kategori">
              <Select
                items={categoryItems}
                value={filters.categoryId ?? ALL}
                onValueChange={(v) =>
                  v && set({ categoryId: v === ALL ? undefined : v })
                }
              >
                <SelectTrigger id="filter-category" className={selectTriggerClass}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL} className={selectItemClass}>
                    Semua kategori
                  </SelectItem>
                  {CATEGORY_KINDS.filter(
                    (kind) => !allowedKind || kind === allowedKind,
                  ).map((kind) => (
                    <CategoryGroup
                      key={kind}
                      label={KIND_LABELS[kind]}
                      categories={categoryList.filter((c) => c.kind === kind)}
                    />
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        </div>
      </ResponsiveModal>
    </>
  );
}

function CategoryGroup({
  label,
  categories,
}: {
  label: string;
  categories: Category[];
}) {
  if (categories.length === 0) return null;
  return (
    <SelectGroup>
      <SelectLabel>{label}</SelectLabel>
      {categories.map((c) => (
        <SelectItem key={c.id} value={c.id} className={selectItemClass}>
          {archiveLabel(c)}
        </SelectItem>
      ))}
    </SelectGroup>
  );
}
