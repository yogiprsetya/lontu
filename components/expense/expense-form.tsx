'use client';

import { useState } from 'react';
import { mutate } from 'swr';
import { Controller } from 'react-hook-form';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Field, FieldLabel, FieldDescription, FieldError } from '~/components/ui/field';
import { useCategoryList } from '~/components/category/use-category-list';
import { formatIdr } from '~/utils/format';
import { httpClient } from '~/config/http-client';
import { errorHandler } from '~/utils/error-handler';
import { OFFLINE_ERROR_MESSAGE } from '~/utils/offline-cache';
import { useExpenseForm } from './use-expense-form';
import { type ExpenseFormValues } from '~/utils/validators/expense';

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

export const ExpenseForm = ({ categories = DEFAULT_CATEGORIES }: ExpenseFormProps) => {
  const { categories: savedCategories } = useCategoryList();
  const availableCategories =
    savedCategories.length > 0 ? savedCategories.map((category) => category.name) : categories;
  const [isSaving, setIsSaving] = useState(false);
  const [recent, setRecent] = useState<SavedExpense[]>([]);

  const { form, handleSubmit, reset } = useExpenseForm();
  const selectedCategory = form.watch('categoryName');

  const onSubmit = async (data: ExpenseFormValues) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      errorHandler(new Error(OFFLINE_ERROR_MESSAGE));

      return;
    }

    setIsSaving(true);
    try {
      const result = await httpClient.post<{ expense: SavedExpense }>('/api/expenses', {
        categoryName: data.categoryName,
        amount: data.amount,
        note: data.note,
        spentAt: data.spentAt,
      });

      const expense = result?.expense;

      if (!expense) {
        throw new Error('No expense data returned');
      }

      setRecent((prev) => [
        {
          id: expense.id,
          amount: expense.amount,
          categoryName: data.categoryName,
          note: expense.note,
          spentAt: expense.spentAt,
        },
        ...prev,
      ]);

      reset();
      await mutate('/api/expenses');
    } catch (err) {
      errorHandler(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
      <section>
        <h2 className="text-foreground mb-2.5 text-base font-semibold">Categories</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {availableCategories.map((category) => (
            <Button
              key={category}
              type="button"
              variant={selectedCategory === category ? 'default' : 'outline'}
              aria-pressed={selectedCategory === category}
              onClick={() => form.setValue('categoryName', category)}
              className="flex h-auto flex-col items-center gap-1.5 py-2.5"
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                  selectedCategory === category
                    ? 'bg-primary-foreground/20 text-primary-foreground'
                    : 'bg-primary/10 text-foreground'
                }`}
              >
                {category[0]}
              </span>
              <span className="text-xs">{category}</span>
            </Button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <Controller
          name="amount"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Amount</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="0"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>Enter the expense amount</FieldDescription>
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="note"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Note</FieldLabel>
              <Input {...field} id={field.name} placeholder="Optional note" aria-invalid={fieldState.invalid} />
              <FieldDescription>Add an optional note for this expense</FieldDescription>
              {fieldState.error && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </section>

      <Button type="submit" size="lg" disabled={isSaving} className="w-full">
        {isSaving ? 'Saving...' : 'Save expense'}
      </Button>

      <p role="status" aria-live="polite" className="text-muted-foreground text-xs">
        You are offline. Saved data stays viewable, but new expenses need a connection.
      </p>

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
                <span className="text-sm font-semibold">{formatIdr(expense.amount)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </form>
  );
};
