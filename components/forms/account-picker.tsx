"use client";

import { useEffect } from "react";
import { PlusIcon } from "lucide-react";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { archiveLabel, selectableItems } from "@/lib/archived";
import { useAccounts } from "@/hooks/use-accounts";
import { useUIStore } from "@/stores/ui";
import { selectTriggerClass, selectItemClass } from "@/components/forms/field-styles";

type AccountPickerProps = {
  id: string;
  value: string;
  onChange: (id: string) => void;
  /** Leaves this account out, e.g. the source when picking a transfer destination. */
  exclude?: string;
  /** The stored account of a transaction being edited: still offered, labelled "(arsip)", if archived. */
  keep?: string;
  invalid?: boolean;
  describedBy?: string;
};

/** Active accounts only. With exactly one choice it is picked for the user. */
export function AccountPicker({
  id,
  value,
  onChange,
  exclude,
  keep,
  invalid,
  describedBy,
}: AccountPickerProps) {
  const { data: all, error, mutate } = useAccounts({ includeArchived: !!keep });
  const data = all && selectableItems(all, keep).filter((a) => a.id !== exclude);
  const open = useUIStore((s) => s.open);
  const onlyAccount = data?.length === 1 ? data[0].id : undefined;

  useEffect(() => {
    if (onlyAccount && !value) onChange(onlyAccount);
  }, [onlyAccount, value, onChange]);

  if (error) return <LoadError onRetry={() => void mutate()} message="Gagal memuat akun." />;
  if (!data) return <Skeleton className="h-11 w-full" aria-label="Memuat akun" />;

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border-2 border-dashed px-4 py-4">
        <p className="text-sm text-muted-foreground">Belum ada akun aktif.</p>
        <Button
          type="button"
          variant="outline"
          className="h-11 text-base"
          onClick={() => open("manageAccounts")}
        >
          <PlusIcon aria-hidden />
          Tambah akun
        </Button>
      </div>
    );
  }

  const items = data.map((a) => ({ value: a.id, label: archiveLabel(a) }));

  return (
    <Select items={items} value={value || null} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger
        id={id}
        className={selectTriggerClass}
        aria-invalid={invalid}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder="Pilih akun" />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false}>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} className={selectItemClass}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
