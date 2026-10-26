import { BudgetProgress } from "@/components/budgets/budget-progress";
import { Button } from "@/components/ui/button";
import { formatBudgetAmount, statusLabel } from "@/lib/budget-format";
import type { BudgetUsageItem } from "@/lib/schemas/budget";
import { cn } from "@/lib/utils";

type Props = { item: BudgetUsageItem; name: string; hideAmounts: boolean; onEdit?: () => void };

export function BudgetRow({ item, name, hideAmounts, onEdit }: Props) {
  const money = (amount: number) => formatBudgetAmount(amount, hideAmounts);
  const text = statusLabel(item.status);

  if (item.budget === null) {
    return (
      <li className="flex min-h-14 items-center justify-between gap-3 py-2">
        <div className="min-w-0">
          <p className="truncate font-bold">{name}</p>
          <p className="truncate text-sm text-muted-foreground tabular-nums">{money(item.spent)} terpakai</p>
        </div>
        <Button variant="outline" className="h-11 shrink-0 text-base" disabled={!onEdit} onClick={onEdit}>
          Atur budget
        </Button>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        disabled={!onEdit}
        onClick={onEdit}
        className="flex min-h-14 w-full flex-col gap-2 py-3 text-left disabled:cursor-default"
      >
        <span className="flex w-full items-baseline justify-between gap-3">
          <span className="min-w-0 truncate font-bold">{name}</span>
          <span
            className={cn(
              "shrink-0 text-sm tabular-nums",
              item.status === "over" ? "text-expense" : item.status === "warning" ? "text-budget" : "text-muted-foreground",
            )}
          >
            {item.remaining! < 0 ? `Lebih ${money(-item.remaining!)}` : `Sisa ${money(item.remaining!)}`}
          </span>
        </span>
        <BudgetProgress
          percent={item.percent}
          status={item.status}
          label={`${item.percent ?? 0}% terpakai${text ? `, ${text}` : ""}`}
        />
        <span className="flex w-full flex-wrap justify-between gap-x-3 text-sm text-muted-foreground tabular-nums">
          <span>
            {money(item.spent)} dari {money(item.budget)}
            {item.percent !== null && ` · ${item.percent}%`}
          </span>
          {text && (
            <span className={cn("font-bold", item.status === "over" ? "text-expense" : "text-budget")}>{text}</span>
          )}
        </span>
      </button>
    </li>
  );
}
