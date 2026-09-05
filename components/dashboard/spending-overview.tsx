'use client';

import useSWR from 'swr';
import { useBudgetData } from '~/components/budget/use-budget-data';
import { getBudgetBurnState, getMonthlyBudgetTotals } from '~/utils/budget-math';
import { formatIdr } from '~/utils/format';
import { Progress, ProgressLabel, ProgressValue } from '~/components/ui/progress';

interface Expense {
  categoryId: number;
  categoryName: string;
  amount: number;
  spentAt: string;
}

const currentDate = new Date();
const currentYear = currentDate.getFullYear();
const currentMonth = currentDate.getMonth() + 1;

export const SpendingOverview = () => {
  const { data: budgetData } = useBudgetData(currentYear, currentMonth);
  const { data: expenseData } = useSWR<{ expenses: Expense[] }>('/api/expenses');
  const expenses = (expenseData?.expenses ?? []).filter((expense) => {
    const spentAt = new Date(expense.spentAt);
    return spentAt.getFullYear() === currentYear && spentAt.getMonth() + 1 === currentMonth;
  });
  const totals = getMonthlyBudgetTotals(budgetData?.budgets ?? [], expenses);

  return (
    <section className="bg-card rounded-xl border p-5 shadow-sm sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Spending overview</p>
          <h2 className="text-foreground mt-1 text-lg font-semibold">Monthly activity</h2>
        </div>

        <span className="text-muted-foreground text-xs font-medium">
          {new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(currentDate)}
        </span>
      </div>

      {totals.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">No spending or budgets for this month.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {totals.map((total) => {
            const burn = getBudgetBurnState(total);
            const valued = `${formatIdr(total.spent)}${total.budget > 0 ? ` / ${formatIdr(total.budget)}` : ' spent'}`;

            return (
              <div key={total.categoryId}>
                <Progress value={burn.percentage} className="w-full">
                  <ProgressLabel>{total.categoryName}</ProgressLabel>
                  <ProgressValue>{() => valued}</ProgressValue>
                </Progress>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-muted-foreground mt-6 flex items-center justify-between text-xs">
        <span>{totals.filter((total) => total.budget > 0).length} budgeted categories</span>
        <span>{formatIdr(totals.reduce((sum, total) => sum + total.spent, 0))} spent</span>
      </div>
    </section>
  );
};
