interface BudgetTotalInput {
  categoryId: number;
  categoryName: string;
  amount: number;
}

interface ExpenseTotalInput {
  categoryId: number;
  amount: number;
}

interface BudgetTotal {
  categoryId: number;
  categoryName: string;
  budget: number;
  spent: number;
}

type BudgetBurnStatus = 'neutral' | 'on-track' | 'near-limit' | 'over-limit';

interface BudgetBurnState {
  percentage: number;
  remaining: number;
  overage: number;
  status: BudgetBurnStatus;
}

export const getBudgetBurnState = ({ budget, spent }: Pick<BudgetTotal, 'budget' | 'spent'>): BudgetBurnState => {
  if (budget <= 0) {
    return { percentage: 0, remaining: 0, overage: 0, status: 'neutral' };
  }

  const percentage = Math.round((spent / budget) * 100);
  const remaining = Math.max(budget - spent, 0);
  const overage = Math.max(spent - budget, 0);
  const status = spent > budget ? 'over-limit' : percentage >= 80 ? 'near-limit' : 'on-track';

  return { percentage, remaining, overage, status };
};

export const getMonthlyBudgetTotals = (
  budgets: BudgetTotalInput[],
  expenses: ExpenseTotalInput[]
): BudgetTotal[] => {
  const totals = new Map<number, BudgetTotal>();

  for (const budget of budgets) {
    totals.set(budget.categoryId, {
      categoryId: budget.categoryId,
      categoryName: budget.categoryName,
      budget: budget.amount,
      spent: 0,
    });
  }

  for (const expense of expenses) {
    const current = totals.get(expense.categoryId);
    if (current) {
      current.spent += expense.amount;
    } else {
      totals.set(expense.categoryId, {
        categoryId: expense.categoryId,
        categoryName: 'Unbudgeted',
        budget: 0,
        spent: expense.amount,
      });
    }
  }

  return [...totals.values()];
};
