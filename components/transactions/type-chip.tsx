import { ArrowDownLeftIcon, ArrowLeftRightIcon, ArrowUpRightIcon, PiggyBankIcon, SlidersHorizontalIcon, type LucideIcon } from "lucide-react";
import type { ListTransactionType } from "@/lib/schemas/transaction";
import { cn } from "@/lib/utils";

/** One color per type, everywhere: see DESIGN.md. */
export const TYPE_STYLES: Record<ListTransactionType, { icon: LucideIcon; tile: string; pop: string }> = {
  income: { icon: ArrowDownLeftIcon, tile: "bg-mint text-mint-foreground", pop: "bg-mint-pop text-white" },
  expense: { icon: ArrowUpRightIcon, tile: "bg-peach text-peach-foreground", pop: "bg-peach-pop text-white" },
  saving: { icon: PiggyBankIcon, tile: "bg-lilac text-lilac-foreground", pop: "bg-lilac-pop text-white" },
  transfer: { icon: ArrowLeftRightIcon, tile: "bg-sky text-sky-foreground", pop: "bg-sky-pop text-white" },
  adjustment: { icon: SlidersHorizontalIcon, tile: "bg-muted text-muted-foreground", pop: "bg-muted-foreground text-background" },
};

export function TypeChip({ type, className }: { type: ListTransactionType; className?: string }) {
  const { icon: Icon, tile } = TYPE_STYLES[type];
  return (
    <span aria-hidden className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tile, className)}>
      <Icon className="size-5" />
    </span>
  );
}
