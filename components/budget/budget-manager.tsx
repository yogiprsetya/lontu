'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { useCategoryList } from '~/components/category/use-category-list';
import { useBudgetData, type Budget } from './use-budget-data';

const currentDate = new Date();

export const BudgetManager = () => {
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [year, setYear] = useState(String(currentDate.getFullYear()));
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { categories } = useCategoryList();
  const { data, mutate } = useBudgetData(year, month);
  const budgets = data?.budgets ?? [];

  const saveBudget = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const response = await fetch(editingId ? `/api/budgets/${editingId}` : '/api/budgets', {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryId, amount, year, month }),
    });
    if (!response.ok) {
      const body = await response.json();
      setError(body.error?.message || 'Unable to save budget');
      return;
    }
    setAmount('');
    setEditingId(null);
    await mutate();
  };

  const editBudget = (budget: Budget) => {
    setEditingId(budget.id);
    setCategoryId(String(budget.categoryId));
    setAmount(String(budget.amount));
    setYear(String(budget.year));
    setMonth(String(budget.month));
  };

  const removeBudget = async (id: number) => {
    const response = await fetch(`/api/budgets/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setError('Unable to remove budget');
      return;
    }
    await mutate();
  };

  return (
    <section className="flex flex-col gap-5">
      <form onSubmit={saveBudget} className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-4">
        <Select value={categoryId || null} onValueChange={(value) => setCategoryId(value ?? '')}>
          <SelectTrigger aria-label="Budget category" className="w-full">
            <SelectValue placeholder="Category" />
          </SelectTrigger>

          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={String(category.id)}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          aria-label="Budget amount"
          type="number"
          min="1"
          step="1"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Monthly IDR"
          required
        />

        <Input
          aria-label="Budget year"
          type="number"
          min="1970"
          max="9999"
          value={year}
          onChange={(event) => setYear(event.target.value)}
          required
        />

        <div className="flex gap-2">
          <Input
            aria-label="Budget month"
            type="number"
            min="1"
            max="12"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            required
          />
          <Button type="submit">{editingId ? 'Save' : 'Add'}</Button>
        </div>
      </form>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {budgets.map((budget) => (
          <article key={budget.id} className="bg-card flex items-center justify-between rounded-xl border p-4">
            <div>
              <h2 className="font-medium">{budget.categoryName}</h2>
              <p className="text-muted-foreground text-sm">Rp{budget.amount.toLocaleString('id-ID')} this month</p>
            </div>

            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => editBudget(budget)}>
                Edit
              </Button>

              <Button type="button" variant="ghost" size="sm" onClick={() => removeBudget(budget.id)}>
                Remove
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};
