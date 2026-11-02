"use client";

import { BudgetProgress } from "@/components/budgets/budget-progress";
import { useAmountFormat } from "@/hooks/use-amount-format";
import { goalPercent, goalProjectionText } from "@/lib/goal-format";
import type { Account } from "@/lib/schemas/account";
import type { GoalProgress } from "@/lib/schemas/goal";
import { cn } from "@/lib/utils";
import { formatMarketGain, valuedLabel } from "@/lib/valuation-format";

type GoalCardProps = {
  goal: GoalProgress;
  accounts: Map<string, Account>;
  /** Last value date per asset account, for the stale lines. */
  lastValuedAt: Map<string, string | null>;
  today: string;
  /** Opens Perbarui nilai; undefined while offline. */
  onValue?: () => void;
  /** Actions on the right of the title (edit, menu). */
  children?: React.ReactNode;
};

export function GoalCard({
  goal,
  accounts,
  lastValuedAt,
  today,
  onValue,
  children,
}: GoalCardProps) {
  const money = useAmountFormat();
  const percent = goalPercent(goal.current, goal.targetAmount);
  const [first, ...rest] = goalProjectionText(goal, money);
  const { reached, overdue, onTrack } = goal.projection;
  const late = !reached && (overdue || onTrack === false);

  return (
    <article aria-labelledby={`goal-${goal.id}`} className="flex flex-col gap-3 surface px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <h3 id={`goal-${goal.id}`} className="min-w-0 font-heading text-lg font-bold break-words">
          {goal.name}
        </h3>
        {children && <div className="-mt-2 -mr-2 flex shrink-0 gap-1">{children}</div>}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0">
            <span className="font-heading text-xl font-extrabold">{money(goal.current)}</span>{" "}
            <span className="text-sm text-muted-foreground">dari {money(goal.targetAmount)}</span>
          </p>
          <p className="shrink-0 font-bold">{percent}%</p>
        </div>
        <BudgetProgress
          percent={percent}
          status="ok"
          label={`${percent}% dari target ${goal.name}`}
        />
        <p className="text-sm text-muted-foreground">
          Disetor {money(goal.contributed)} · Pasar {money(goal.marketGain, formatMarketGain)}
        </p>
      </div>

      <div className="flex flex-col gap-0.5">
        <p className={cn("font-semibold", reached && "text-income")}>{first}</p>
        {rest.map((line) => (
          <p key={line} className={cn("text-sm", late ? "text-expense" : "text-muted-foreground")}>
            {line}
          </p>
        ))}
      </div>

      {goal.staleAccountIds.length > 0 && (
        <ul className="flex flex-col gap-1">
          {goal.staleAccountIds.map((id) => {
            const text = `Nilai ${accounts.get(id)?.name ?? "akun"} ${valuedLabel(lastValuedAt.get(id) ?? null, today)}`;
            return (
              <li key={id} className="flex min-h-11 items-center justify-between gap-3 text-sm">
                <span className="min-w-0 font-semibold text-expense">{text}</span>
                {onValue && (
                  <button
                    type="button"
                    onClick={onValue}
                    className="min-h-11 shrink-0 rounded-md px-2 font-bold underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    Perbarui
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
