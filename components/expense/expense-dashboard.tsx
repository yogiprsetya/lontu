'use client';

import { useState } from 'react';
import ExpenseForm from './expense-form';
import ExpenseList from './expense-list';

export default function ExpenseDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="flex flex-col gap-8">
      <ExpenseForm onSaved={() => setRefreshKey((key) => key + 1)} />

      <section>
        <h2 className="text-foreground mb-3 text-base font-semibold">History</h2>
        <ExpenseList refreshKey={refreshKey} />
      </section>
    </div>
  );
}
