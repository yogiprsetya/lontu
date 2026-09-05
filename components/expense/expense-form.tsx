'use client';

import { useState } from 'react';
import { mutate } from 'swr';
import { Button } from '~/components/ui/button';

interface ExpenseFormProps {
  categories?: string[];
}

interface SavedExpense {
  id: number;
  amount: number;
  categoryName: string;
  note?: string | null;
  spentAt: string;
}

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Other'];

const formatRupiah = (amount: number): string => {
  return `Rp${amount.toLocaleString('id-ID')}`;
};

const ExpenseForm = ({ categories = DEFAULT_CATEGORIES }: ExpenseFormProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<SavedExpense[]>([]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!selectedCategory) {
      setError('Select a category first');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryName: selectedCategory,
          amount,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save expense');
      }

      setRecent((prev) => [
        {
          id: data.expense.id,
          amount: data.expense.amount,
          categoryName: selectedCategory,
          note: data.expense.note,
          spentAt: data.expense.spentAt,
        },
        ...prev,
      ]);

      setAmount('');
      setSelectedCategory(null);
      await mutate('/api/expenses');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <section>
        <h2 className="text-foreground mb-2.5 text-base font-semibold">Categories</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {categories.map((category) => {
            const isSelected = selectedCategory === category;

            return (
              <Button
                key={category}
                type="button"
                variant={isSelected ? 'default' : 'outline'}
                aria-pressed={isSelected}
                onClick={() => setSelectedCategory(category)}
                className="flex h-auto flex-col items-center gap-1.5 py-2.5"
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                    isSelected
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-primary/10 text-foreground'
                  }`}
                >
                  {category[0]}
                </span>
                <span className="text-xs">{category}</span>
              </Button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <label htmlFor="amount" className="text-foreground text-sm font-medium">
          Amount
        </label>
        <input
          id="amount"
          name="amount"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          className="bg-muted text-foreground focus:ring-ring h-11 rounded-lg px-4 text-lg outline-none focus:ring-2"
        />
      </section>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <Button type="submit" size="lg" disabled={isSaving || !selectedCategory || amount === ''} className="w-full">
        {isSaving ? 'Saving...' : 'Save expense'}
      </Button>

      {recent.length > 0 && (
        <section className="mt-2">
          <h3 className="text-muted-foreground mb-2 text-sm font-medium">Just added</h3>
          <ul className="space-y-2">
            {recent.map((expense) => (
              <li
                key={expense.id}
                className="bg-card text-card-foreground flex items-center justify-between rounded-xl border px-4 py-3"
              >
                <span className="text-sm font-medium">{expense.categoryName}</span>
                <span className="text-sm font-semibold">{formatRupiah(expense.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </form>
  );
};

export default ExpenseForm;
