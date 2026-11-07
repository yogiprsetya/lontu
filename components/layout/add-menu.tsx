"use client";

import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TypeChip } from "@/components/transactions/type-chip";
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS } from "@/lib/transaction-types";

const contentClass = "min-w-52";

/** The round + in the bottom nav; the menu opens upward. */
export function FabAddMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Tambah transaksi"
        render={<Button size="fab" />}
        className="-mt-6"
      >
        <PlusIcon aria-hidden />
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
        render={<Button size="fab" />}
        className="fixed right-8 bottom-8 z-40 hidden lg:inline-flex"
      >
        <PlusIcon aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" sideOffset={8} className={contentClass}>
        <AddMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AddMenuItems() {
  return TRANSACTION_TYPES.map((type) => (
    <DropdownMenuItem key={type} render={<Link href={`/add/${type}`} />}>
      <TypeChip type={type} className="size-9 rounded-lg" />
      {TRANSACTION_TYPE_LABELS[type]}
    </DropdownMenuItem>
  ));
}
