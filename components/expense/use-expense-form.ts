'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { expenseInputFormSchema, type ExpenseFormInput, type ExpenseFormValues } from '~/utils/validators/expense';

export const useExpenseForm = (initialValues?: Partial<ExpenseFormInput>) => {
  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseInputFormSchema),
    defaultValues: {
      categoryName: initialValues?.categoryName ?? '',
      amount: initialValues?.amount ?? 0,
      note: initialValues?.note ?? '',
      spentAt: (initialValues?.spentAt as Date | undefined) ?? new Date(),
    },
  });

  return {
    form,
    handleSubmit: form.handleSubmit,
    reset: form.reset,
    watch: form.watch,
    control: form.control,
    getFieldState: form.getFieldState,
    formState: form.formState,
  };
};
