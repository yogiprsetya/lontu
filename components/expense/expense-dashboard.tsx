'use client';

import { ExpenseForm } from './expense-form';
import { ExpenseList } from './expense-list';

export const ExpenseDashboard = () => {
  return (
    <div className="flex flex-col gap-8">
      <ExpenseForm />

      <section>
        <h2 className="text-foreground mb-3 text-base font-semibold">History</h2>
        <ExpenseList />
      </section>
    </div>
  );
};
