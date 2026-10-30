import { TYPE_STYLES } from "@/components/transactions/type-styles";
import type { ListTransactionType } from "@/lib/schemas/transaction";
import { cn } from "@/lib/utils";

export function TypeChip({ type, className }: { type: ListTransactionType; className?: string }) {
  const { icon: Icon, tile } = TYPE_STYLES[type];
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl",
        tile,
        className,
      )}
    >
      <Icon className="size-5" />
    </span>
  );
}
