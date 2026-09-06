'use client';

import { useState } from 'react';
import { httpClient } from '~/config/http-client';
import { errorHandler } from '~/utils/error-handler';
import { Button } from '~/components/ui/button';
import { useCategoryList } from '~/components/category/use-category-list';
import { formatIdr } from '~/utils/format';
import { RecurringFormDialog } from '~/components/recurring/recurring-form-dialog';
import { useRecurring, type RecurringItem } from '~/components/recurring/use-recurring-';
import { getRecurringPeriodKey } from '~/utils/recurrence';

const toDateInput = (date: string) => new Date(date).toISOString().slice(0, 10);
const toDateValue = (date: string) => new Date(`${date}T00:00:00`);
const toDateString = (date: Date | undefined) =>
  date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : '';

export const RecurringManager = () => {
  const { data, error, mutate } = useRecurring();
  const { categories } = useCategoryList();
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly'>('monthly');
  const [startDate, setStartDate] = useState(() =>
    new Date(new Date().setHours(0, 0, 0, 0)).toISOString().slice(0, 10)
  );
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [markedPeriodKeys, setMarkedPeriodKeys] = useState<string[]>([]);
  const [markingId, setMarkingId] = useState<number | null>(null);

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
    try {
      await httpClient.post(endpoint, {
        ...(!editingId ? { categoryId } : {}),
        amount,
        frequency,
        startDate,
        note: note || undefined,
      });
      resetForm();
      await mutate();
    } catch (err) {
      errorHandler(err);
    }
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
    try {
      await httpClient.delete(`/api/recurring/${id}`);
      await mutate();
    } catch (err) {
      errorHandler(err);
    }
  };

  const markPeriodSpent = async (item: RecurringItem) => {
    const periodKey = `${item.id}:${getRecurringPeriodKey(new Date(), item.frequency)}`;
    if (markedPeriodKeys.includes(periodKey) || markingId === item.id) return;

    setMarkingId(item.id);
    try {
      await httpClient.post(`/api/recurring/${item.id}`);
      setMarkedPeriodKeys((currentKeys) =>
        currentKeys.includes(periodKey) ? currentKeys : [...currentKeys, periodKey]
      );
      setMarkingId(null);
      await mutate();
    } catch (err) {
      errorHandler(err);
    }
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

      <RecurringFormDialog
        open={isDialogOpen}
        isEditing={editingId !== null}
        categoryId={categoryId}
        selectedCategoryName={selectedCategoryName}
        amount={amount}
        frequency={frequency}
        startDate={toDateValue(startDate)}
        note={note}
        categories={categories}
        formError={formError}
        onOpenChange={setIsDialogOpen}
        onSubmit={saveRecurring}
        onCategoryChange={setCategoryId}
        onAmountChange={setAmount}
        onFrequencyChange={setFrequency}
        onStartDateChange={(date) => setStartDate(toDateString(date))}
        onNoteChange={setNote}
        onCancel={() => setIsDialogOpen(false)}
      />

      {error && <p className="text-destructive text-sm">Unable to load recurring expenses.</p>}

      <ul className="divide-y">
        {recurringItems.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
            <div>
              <p className="text-foreground font-medium">{item.categoryName}</p>
              <p className="text-muted-foreground text-sm">
                {formatIdr(item.amount)} · {item.frequency} · from {toDateInput(item.startDate)}
              </p>
              {item.isActive === 1 && item.nextOccurrence && (
                <p className="text-muted-foreground text-xs">
                  Next occurrence: {toDateInput(item.nextOccurrence)}
                </p>
              )}
              {item.note && <p className="text-muted-foreground text-xs">{item.note}</p>}
            </div>

            <div className="flex gap-1">
              {item.isActive === 1 &&
                (() => {
                  const periodKey = `${item.id}:${getRecurringPeriodKey(new Date(), item.frequency)}`;
                  const isMarked = item.markedExpenseId !== null || markedPeriodKeys.includes(periodKey);
                  const isMarking = markingId === item.id;

                  return (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isMarked || isMarking}
                      onClick={() => markPeriodSpent(item)}
                    >
                      {isMarked ? 'Spent this period' : isMarking ? 'Marking...' : 'Mark this period as spent'}
                    </Button>
                  );
                })()}

              <Button type="button" variant="ghost" size="sm" onClick={() => editRecurring(item)}>
                Edit
              </Button>

              <Button type="button" variant="ghost" size="sm" onClick={() => deactivateRecurring(item.id)}>
                {item.isActive === 1 ? 'Deactivate' : 'Inactive'}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};
