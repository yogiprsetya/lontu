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
