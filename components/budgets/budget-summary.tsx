import { BudgetProgress } from "@/components/budgets/budget-progress";
import { formatBudgetAmount, groupStatus, statusLabel } from "@/lib/budget-format";
import type { BudgetUsage } from "@/lib/schemas/budget";
import { cn } from "@/lib/utils";

const GROUPS = [
  { key: "total", label: "Total" },
  { key: "needs", label: "Needs" },
  { key: "wants", label: "Wants" },
] as const;

export function BudgetSummary({ summary, hideAmounts }: { summary: BudgetUsage["summary"]; hideAmounts: boolean }) {
  const money = (amount: number) => formatBudgetAmount(amount, hideAmounts);

  return (
    <section aria-label="Ringkasan budget" className="grid gap-2 sm:grid-cols-3">
      {GROUPS.map(({ key, label }) => {
        const group = summary[key];
        const { budgetedSpent, remaining, percent, status } = groupStatus(group);
        const text = statusLabel(status);
        return (
          <div key={key} className="flex min-w-0 flex-col gap-2 rounded-lg border px-3 py-3">
            <h2 className="text-sm text-muted-foreground">{label}</h2>
            {remaining === null ? (
              <p className="font-medium">Belum ada budget</p>
            ) : (
              <>
                <p className="truncate font-semibold tabular-nums">
                  {money(budgetedSpent)} <span className="font-normal text-muted-foreground">dari {money(group.budget)}</span>
                </p>
                <BudgetProgress
                  percent={percent}
                  status={status}
                  label={`${label}: ${percent ?? 0}% terpakai${text ? `, ${text}` : ""}`}
                />
                <p className={cn("text-sm tabular-nums", status === "over" ? "text-expense" : status === "warning" && "text-budget")}>
                  {remaining < 0 ? `Lebih ${money(-remaining)}` : `Sisa ${money(remaining)}`}
                  {text && ` · ${text}`}
                </p>
              </>
            )}
            {group.unbudgetedSpent > 0 && (
              <p className="text-sm text-muted-foreground tabular-nums">{money(group.unbudgetedSpent)} tanpa budget</p>
            )}
          </div>
        );
      })}
    </section>
  );
}
