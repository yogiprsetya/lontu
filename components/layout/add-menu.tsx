"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TypeChip } from "@/components/transactions/type-chip";
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS } from "@/lib/transaction-types";

const triggerClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground outline-none transition-colors hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-ring/50";
const contentClass = "min-w-52 rounded-2xl p-1.5";

/** The round + in the bottom nav; the menu opens upward. */
export function FabAddMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Tambah transaksi"
        className={cn(
          triggerClass,
          "-mt-6 size-14 shadow-soft ring-4 ring-card transition-transform motion-safe:hover:rotate-90 motion-safe:active:scale-90",
        )}
      >
        <PlusIcon className="size-5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" sideOffset={8} className={contentClass}>
        <AddMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The floating + at the bottom right on lg and up, where there is no bottom nav. */
export function DesktopFabAddMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Tambah transaksi"
        className={cn(
          triggerClass,
          "fixed right-8 bottom-8 z-40 hidden size-14 shadow-soft transition-transform motion-safe:hover:rotate-90 motion-safe:active:scale-90 lg:inline-flex",
        )}
      >
        <PlusIcon className="size-5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" sideOffset={8} className={contentClass}>
        <AddMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddMenuItems() {
  return TRANSACTION_TYPES.map((type) => (
    <DropdownMenuItem
      key={type}
      className="min-h-12 gap-3 rounded-xl text-base font-semibold"
      render={<Link href={`/add/${type}`} />}
    >
      <TypeChip type={type} className="size-9 rounded-lg" />
      {TRANSACTION_TYPE_LABELS[type]}
    </DropdownMenuItem>
  ));
}
