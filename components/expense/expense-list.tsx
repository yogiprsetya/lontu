'use client';

import { ExpenseCard } from './expense-card';
import { useExpenseList } from './use-expense-list';

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Other'];

export interface ExpenseListItem {
  id: number;
  amount: number;
  note?: string | null;
  spentAt: string;
  categoryName: string;
  categoryColor?: string | null;
}

export interface GroupedExpenses {
  date: string;
  label: string;
  items: ExpenseListItem[];
}

const formatGroupLabel = (dateKey: string): string => {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  if (dateKey === today) return 'Today';
  if (dateKey === yesterday) return 'Yesterday';

  return new Date(dateKey).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
};

export const groupExpensesByDate = (items: ExpenseListItem[]): GroupedExpenses[] => {
  const map = new Map<string, ExpenseListItem[]>();

  for (const item of items) {
    const date = new Date(item.spentAt);
    const key = date.toISOString().slice(0, 10);

    if (!map.has(key)) {
      map.set(key, []);
    }

    map.get(key)!.push(item);
  }

  return Array.from(map.entries())
    .sort(([firstDate], [secondDate]) => secondDate.localeCompare(firstDate))
    .map(([date, groupItems]) => ({
      date,
      label: formatGroupLabel(date),
      items: groupItems.sort(
        (firstItem, secondItem) => new Date(secondItem.spentAt).getTime() - new Date(firstItem.spentAt).getTime()
      ),
    }));
};

export const ExpenseList = () => {
  const { data, error, isLoading, mutate } = useExpenseList();
  const expenses = data?.expenses ?? [];

  const grouped = groupExpensesByDate(expenses);

  if (isLoading) {
    return <p className="text-muted-foreground text-sm">Loading history…</p>;
  }

  if (error) {
    return <p className="text-destructive text-sm">{error.message}</p>;
  }

  if (expenses.length === 0) {
    return <p className="text-muted-foreground text-sm">No expenses yet. Tap a category above to add one.</p>;
  }

  return (
    <section className="flex flex-col gap-6">
      {grouped.map((group) => (
        <div key={group.date}>
          <h3 className="text-muted-foreground mb-2 text-sm font-semibold">{group.label}</h3>
          <ul className="space-y-2">
            {group.items.map((expense) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                categories={DEFAULT_CATEGORIES}
                onMutate={() => mutate()}
              />
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
};
