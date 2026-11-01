import { BudgetProgress } from "@/components/budgets/budget-progress";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { statusLabel, usedPercent } from "@/lib/budget-format";
import type { BudgetUsageItem } from "@/lib/schemas/budget-usage";
import { cn } from "@/lib/utils";

const TYPE_LABEL = { needs: "Needs", wants: "Wants" } as const;

type Props = { item: BudgetUsageItem; categoryNames: string; onOpen?: () => void };

export function BudgetRow({ item, categoryNames, onOpen }: Props) {
  const money = useAmountFormat();
  const text = statusLabel(item.status);
  const used = usedPercent(item.spent, item.percent);

  return (
    <li>
      <button
        type="button"
        disabled={!onOpen}
        onClick={onOpen}
        className="flex min-h-14 w-full flex-col gap-2 py-3 text-left disabled:cursor-default"
      >
        <span className="flex w-full items-baseline justify-between gap-3">
          <span className="min-w-0 truncate font-bold">{item.name}</span>
          <span
            className={cn(
              "shrink-0 text-sm tabular-nums",
              item.status === "over"
                ? "text-expense"
                : item.status === "warning"
                  ? "text-budget"
                  : "text-muted-foreground",
            )}
          >
            {item.remaining < 0
              ? `Lebih ${money(-item.remaining)}`
              : `Sisa ${money(item.remaining)}`}
          </span>
        </span>
        <span className="w-full truncate text-sm text-muted-foreground">
          {TYPE_LABEL[item.spendingType]} · {categoryNames}
        </span>
        <BudgetProgress
          percent={used.bar}
          status={item.status}
          label={`${used.text ?? "0%"} terpakai${text ? `, ${text}` : ""}`}
        />
        <span className="flex w-full flex-wrap justify-between gap-x-3 text-sm text-muted-foreground tabular-nums">
          <span>
            {money(item.spent)} dari {money(item.budget)}
            {used.text && ` · ${used.text}`}
          </span>
          {text && (
            <span
              className={cn("font-bold", item.status === "over" ? "text-expense" : "text-budget")}
            >
              {text}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
