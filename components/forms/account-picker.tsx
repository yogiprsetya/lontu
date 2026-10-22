"use client";

import { useEffect } from "react";
import { PlusIcon } from "lucide-react";
import { LoadError } from "@/components/settings/load-error";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccounts } from "@/hooks/use-accounts";
import { useUIStore } from "@/stores/ui";

type AccountPickerProps = {
  id: string;
  value: string;
  onChange: (id: string) => void;
  /** Leaves this account out, e.g. the source when picking a transfer destination. */
  exclude?: string;
  invalid?: boolean;
  describedBy?: string;
};

/** Active accounts only. With exactly one choice it is picked for the user. */
export function AccountPicker({ id, value, onChange, exclude, invalid, describedBy }: AccountPickerProps) {
  const { data: all, error, mutate } = useAccounts();
  const data = all?.filter((a) => a.id !== exclude);
  const open = useUIStore((s) => s.open);
  const onlyAccount = data?.length === 1 ? data[0].id : undefined;

  useEffect(() => {
    if (onlyAccount && !value) onChange(onlyAccount);
  }, [onlyAccount, value, onChange]);

  if (error) return <LoadError onRetry={() => void mutate()} message="Gagal memuat akun." />;
  if (!data) return <Skeleton className="h-11 w-full" aria-label="Memuat akun" />;

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed px-4 py-4">
        <p className="text-sm text-muted-foreground">Belum ada akun aktif.</p>
        <Button type="button" variant="outline" className="h-11 text-base" onClick={() => open("manageAccounts")}>
          <PlusIcon aria-hidden />
          Tambah akun
        </Button>
      </div>
    );
  }

  const items = data.map((a) => ({ value: a.id, label: a.name }));

  return (
    <Select items={items} value={value || null} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger
        id={id}
        className="w-full text-base data-[size=default]:h-11 md:text-sm"
        aria-invalid={invalid}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder="Pilih akun" />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value} className="min-h-11">
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
