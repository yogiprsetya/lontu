import { RiArrowDownLine } from '@remixicon/react';
import { ExpenseDashboard } from '../expense/expense-dashboard';

export const ExpenseOverview = () => (
  <section className="bg-card mt-5 rounded-xl border p-5 shadow-sm sm:p-6">
    <div className="mb-5 flex items-center justify-between">
      <div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Manage</p>
        <h2 className="text-foreground mt-1 text-lg font-semibold">Add and review expenses</h2>
      </div>

      <RiArrowDownLine aria-hidden="true" className="text-muted-foreground size-5" />
    </div>

    <ExpenseDashboard />
  </section>
);
