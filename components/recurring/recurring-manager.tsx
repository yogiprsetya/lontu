'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';
import { Input } from '~/components/ui/input';
import { DatePicker } from '~/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { useCategoryList } from '~/components/category/use-category-list';
import { formatIdr } from '~/utils/format';

interface RecurringItem {
  id: number;
  categoryId: number;
  categoryName: string;
  amount: number;
  frequency: 'monthly' | 'yearly';
  startDate: string;
  note: string | null;
  isActive: number;
}

const toDateInput = (date: string) => new Date(date).toISOString().slice(0, 10);
const toDateValue = (date: string) => new Date(`${date}T00:00:00`);
const toDateString = (date: Date | undefined) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : '';

export const RecurringManager = () => {
  const { data, error, mutate } = useSWR<{ recurring: RecurringItem[] }>('/api/recurring');
  const { categories } = useCategoryList();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setCategoryId('');
    setAmount('');
    setFrequency('monthly');
    setStartDate(new Date().toISOString().slice(0, 10));
    setNote('');
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const saveRecurring = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const endpoint = editingId ? `/api/recurring/${editingId}` : '/api/recurring';
    const response = await fetch(endpoint, {
      method: editingId ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(!editingId ? { categoryId } : {}),
        amount,
        frequency,
        startDate,
        note: note || undefined,
      }),
    });

    if (!response.ok) {
      const responseData = await response.json();
      setFormError(responseData.error?.message || 'Unable to save recurring expense');
      return;
    }

    resetForm();
    await mutate();
  };

  const editRecurring = (item: RecurringItem) => {
    setEditingId(item.id);
    setCategoryId(String(item.categoryId));
    setAmount(String(item.amount));
    setFrequency(item.frequency);
    setStartDate(toDateInput(item.startDate));
    setNote(item.note ?? '');
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const deactivateRecurring = async (id: number) => {
    const response = await fetch(`/api/recurring/${id}`, { method: 'DELETE' });
    if (!response.ok) {
      setFormError('Unable to deactivate recurring expense');
      return;
    }
    await mutate();
  };

  const recurringItems = data?.recurring ?? [];
  const selectedCategoryName = categories.find((category) => String(category.id) === categoryId)?.name;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex justify-end">
        <Button type="button" onClick={openCreateDialog}>
          Add recurring expense
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit recurring expense' : 'Add recurring expense'}</DialogTitle>
            <DialogDescription>Track a subscription or other scheduled payment.</DialogDescription>
          </DialogHeader>

          <form onSubmit={saveRecurring} className="flex flex-col gap-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-muted-foreground flex flex-col gap-1 text-xs">
                Category
                <Select
                  value={categoryId || null}
                  onValueChange={(value) => setCategoryId(value ?? '')}
                  required
                  disabled={editingId !== null}
                >
                  <SelectTrigger aria-label="Recurring category" className="bg-muted w-full">
                    <SelectValue placeholder="Select category">
                      {selectedCategoryName ?? 'Select category'}
                    </SelectValue>
                  </SelectTrigger>

                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label className="text-muted-foreground flex flex-col gap-1 text-xs">
                Amount
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </label>

              <label className="text-muted-foreground flex flex-col gap-1 text-xs">
                Frequency
                <Select
                  value={frequency}
                  onValueChange={(value) => {
                    if (value === 'monthly' || value === 'yearly') setFrequency(value);
                  }}
                >
                  <SelectTrigger aria-label="Recurring frequency" className="bg-muted w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </label>

              <label className="text-muted-foreground flex flex-col gap-1 text-xs">
                Start date
                <DatePicker
                  value={toDateValue(startDate)}
                  onChange={(date) => setStartDate(toDateString(date))}
                  placeholder="Select start date"
                />
              </label>
            </div>
            <label className="text-muted-foreground flex flex-col gap-1 text-xs">
              Note
              <Input value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional note" />
            </label>
            {formError && <p className="text-destructive text-sm">{formError}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingId ? 'Save changes' : 'Add recurring expense'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {error && <p className="text-destructive text-sm">Unable to load recurring expenses.</p>}
      <ul className="divide-y">
        {recurringItems.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="text-foreground font-medium">{item.categoryName}</p>
              <p className="text-muted-foreground text-sm">
                {formatIdr(item.amount)} · {item.frequency} · from {toDateInput(item.startDate)}
              </p>
              {item.note && <p className="text-muted-foreground text-xs">{item.note}</p>}
            </div>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={() => editRecurring(item)}>
                Edit
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => deactivateRecurring(item.id)}>
                Deactivate
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
