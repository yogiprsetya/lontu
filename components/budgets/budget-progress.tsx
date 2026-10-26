import type { BudgetStatus } from "@/lib/budget-status";
import { cn } from "@/lib/utils";

const FILL: Record<BudgetStatus, string> = {
  none: "bg-muted-foreground",
  ok: "bg-mint-pop",
  warning: "bg-budget",
  over: "bg-expense",
};

/** `percent` may exceed 100 or be null (zero budget); the bar and aria value stop at 100. */
export function BudgetProgress({ percent, status, label }: { percent: number | null; status: BudgetStatus; label: string }) {
  const value = status === "over" ? 100 : Math.min(percent ?? 0, 100);
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={label}
      className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
    >
      <div className={cn("h-full rounded-full transition-[width]", FILL[status])} style={{ width: `${value}%` }} />
    </div>
  );
}
