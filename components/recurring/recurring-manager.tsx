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
import { type RecurringFormValues } from '~/utils/validators/recurring';

const toDateInput = (date: string) => new Date(date).toISOString().slice(0, 10);

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

  const saveRecurring = async (data: RecurringFormValues) => {
    setFormError(null);
    const endpoint = editingId ? `/api/recurring/${editingId}` : '/api/recurring';
    try {
      await httpClient.post(endpoint, {
        ...(!editingId ? { categoryId: String(data.categoryId) } : {}),
        amount: String(data.amount),
        frequency: data.frequency,
        startDate: data.startDate.toISOString().slice(0, 10),
        note: data.note || undefined,
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
        categoryId={Number(categoryId)}
        amount={amount}
        frequency={frequency}
        startDate={startDate}
        note={note}
        categories={categories}
        formError={formError}
        onOpenChange={setIsDialogOpen}
        onSubmit={saveRecurring}
        onCancel={() => setIsDialogOpen(false)}
      />

      {error && <p className="text-destructive text-sm">Unable to load recurring expenses.</p>}

      <ul className="divide-y">
        {recurringItems.map((item) => {
          const isPeriodSpent =
            item.markedExpenseId !== null ||
            markedPeriodKeys.includes(`${item.id}:${getRecurringPeriodKey(new Date(), item.frequency)}`);
          const isFutureOccurrence = item.nextOccurrence && new Date(item.nextOccurrence) > new Date();
          const isDisabled = Boolean(
            item.isActive !== 1 ||
            item.markedExpenseId !== null ||
            markingId === item.id ||
            !item.nextOccurrence ||
            isFutureOccurrence
          );
          let label = 'Mark this period as spent';
          if (item.isActive !== 1) {
            label = 'Not active';
          } else if (isPeriodSpent) {
            label = 'Spent this period';
          } else if (markingId === item.id) {
            label = 'Marking...';
          }

          return (
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDisabled}
                  onClick={() => markPeriodSpent(item)}
                >
                  {label}
                </Button>

                <Button type="button" variant="ghost" size="sm" onClick={() => editRecurring(item)}>
                  Edit
                </Button>

                <Button type="button" variant="ghost" size="sm" onClick={() => deactivateRecurring(item.id)}>
                  {item.isActive === 1 ? 'Deactivate' : 'Inactive'}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
