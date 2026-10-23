"use client";

import Link from "next/link";
import { ArrowDownLeftIcon, ArrowLeftRightIcon, ArrowUpRightIcon, PiggyBankIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TRANSACTION_TYPES, TRANSACTION_TYPE_LABELS, type TransactionType } from "@/lib/transaction-types";

const typeStyles: Record<TransactionType, { icon: typeof PlusIcon; className: string }> = {
  income: { icon: ArrowDownLeftIcon, className: "text-income" },
  expense: { icon: ArrowUpRightIcon, className: "text-expense" },
  saving: { icon: PiggyBankIcon, className: "text-budget" },
  transfer: { icon: ArrowLeftRightIcon, className: "text-transfer" },
};

export function AddMenu({ variant }: { variant: "fab" | "sidebar" }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Tambah transaksi"
        className={cn(
          "inline-flex items-center justify-center gap-2 bg-primary font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-ring/50",
          variant === "fab" ? "size-12 rounded-full shadow-md" : "h-11 w-full rounded-md px-3",
        )}
      >
        <PlusIcon className="size-5" aria-hidden />
        {variant === "sidebar" && "Tambah"}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={variant === "fab" ? "top" : "bottom"}
        align={variant === "fab" ? "center" : "start"}
        sideOffset={8}
        className="min-w-48"
      >
        {TRANSACTION_TYPES.map((type) => {
          const { icon: Icon, className } = typeStyles[type];
          return (
            <DropdownMenuItem key={type} className="min-h-11 gap-3 text-base" render={<Link href={`/add/${type}`} />}>
              <Icon className={cn("size-5", className)} aria-hidden />
              {TRANSACTION_TYPE_LABELS[type]}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
