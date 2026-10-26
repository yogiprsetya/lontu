"use client";

import { ChevronRightIcon, TagsIcon, WalletIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUIStore } from "@/stores/ui";

const rowClass =
  "flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-base outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50";

export function FinanceSection() {
  const open = useUIStore((s) => s.open);
  const hideAmounts = useUIStore((s) => s.hideAmounts);
  const toggleHideAmounts = useUIStore((s) => s.toggleHideAmounts);

  return (
    <div className="-mx-3 -my-3 flex flex-col gap-1">
      <button type="button" className={rowClass} onClick={() => open("manageAccounts")}>
        <WalletIcon className="size-5 text-muted-foreground" aria-hidden />
        <span className="flex-1">Kelola akun</span>
        <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
      </button>
      <button type="button" className={rowClass} onClick={() => open("manageCategories")}>
        <TagsIcon className="size-5 text-muted-foreground" aria-hidden />
        <span className="flex-1">Kelola kategori</span>
        <ChevronRightIcon className="size-4 text-muted-foreground" aria-hidden />
      </button>
      {/* The whole row is the label so the tap target is 44px tall, not just the switch. */}
      <Label htmlFor="hide-amounts" className={`${rowClass} cursor-pointer font-normal`}>
        <span className="flex-1">Sembunyikan nominal</span>
        <Switch id="hide-amounts" checked={hideAmounts} onCheckedChange={toggleHideAmounts} />
      </Label>
    </div>
  );
}
