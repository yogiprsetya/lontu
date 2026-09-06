'use client';

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '~/components/ui/button';
import { httpClient } from '~/config/http-client';
import { errorHandler } from '~/utils/error-handler';
import { useCategoryList } from '~/components/category/use-category-list';
import { formatIdr } from '~/utils/format';
import { useBudgetData, type Budget } from './use-budget-data';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Field, FieldLabel, FieldContent, FieldError } from '~/components/ui/field';
import { budgetInputFormSchema, type BudgetFormValues } from '~/utils/validators/budget';

const currentDate = new Date();

export const BudgetManager = () => {
  const [editingId, setEditingId] = useState<number | null>(null);

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetInputFormSchema),
    defaultValues: {
      categoryId: 0,
      amount: 0,
      year: currentDate.getFullYear(),
      month: currentDate.getMonth() + 1,
    },
  });

  const { handleSubmit, reset, control } = form;
  const selectedCategoryId = useWatch({ control, name: 'categoryId' });
  const selectedYear = useWatch({ control, name: 'year' });
  const selectedMonth = useWatch({ control, name: 'month' });
  const { categories } = useCategoryList();
  const { data, mutate } = useBudgetData(selectedYear, selectedMonth);
  const budgets = data?.budgets ?? [];

  const saveBudget = handleSubmit(async (data) => {
    try {
      await httpClient.post(editingId ? `/api/budgets/${editingId}` : '/api/budgets', {
        categoryId: data.categoryId,
        amount: data.amount,
        year: data.year,
        month: data.month,
      });
      reset({
        categoryId: 0,
        amount: 0,
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
      });
      setEditingId(null);
      await mutate();
    } catch (err) {
      errorHandler(err);
    }
  });

  const editBudget = (budget: Budget) => {
    setEditingId(budget.id);
    reset({
      categoryId: budget.categoryId,
      amount: budget.amount,
      year: budget.year,
      month: budget.month,
    });
  };

  const removeBudget = async (id: number) => {
    try {
      await httpClient.delete(`/api/budgets/${id}`);
      await mutate();
    } catch (err) {
      errorHandler(err);
    }
  };

  return (
    <section className="flex flex-col gap-5">
      <form onSubmit={saveBudget} className="bg-card grid gap-3 rounded-xl border p-4 sm:grid-cols-4">
        <Field>
          <FieldLabel>Budget category</FieldLabel>
          <FieldContent>
            <Select
              {...form.register('categoryId')}
              value={selectedCategoryId || undefined}
              onValueChange={(value) => form.setValue('categoryId', value ? Number(value) : 0)}
            >
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
            <FieldError errors={[form.formState.errors.categoryId]} />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Budget amount</FieldLabel>
          <FieldContent>
            <Input
              aria-label="Budget amount"
              type="number"
              min="1"
              step="1"
              {...form.register('amount', { valueAsNumber: true })}
              placeholder="Monthly IDR"
            />
            <FieldError errors={[form.formState.errors.amount]} />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Budget year</FieldLabel>
          <FieldContent>
            <Input
              aria-label="Budget year"
              type="number"
              min="1970"
              max="9999"
              {...form.register('year', { valueAsNumber: true })}
            />
            <FieldError errors={[form.formState.errors.year]} />
          </FieldContent>
        </Field>

        <Field>
          <FieldLabel>Budget month</FieldLabel>
          <FieldContent>
            <div className="flex gap-2">
              <Input
                aria-label="Budget month"
                type="number"
                min="1"
                max="12"
                {...form.register('month', { valueAsNumber: true })}
              />
              <Button type="submit">{editingId ? 'Save' : 'Add'}</Button>
            </div>
            <FieldError errors={[form.formState.errors.month]} />
          </FieldContent>
        </Field>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        {budgets.map((budget) => (
          <article key={budget.id} className="bg-card flex items-center justify-between rounded-xl border p-4">
            <div>
              <h2 className="font-medium">{budget.categoryName}</h2>
              <p className="text-muted-foreground text-sm">{formatIdr(budget.amount)} this month</p>
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
