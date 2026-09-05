'use client';

import useSWR from 'swr';

export interface RecurringItem {
  id: number;
  categoryId: number;
  categoryName: string;
  amount: number;
  frequency: 'monthly' | 'yearly';
  startDate: string;
  note: string | null;
  isActive: number;
  markedExpenseId: number | null;
  nextOccurrence: string | null;
}

export const useRecurring = () => useSWR<{ recurring: RecurringItem[] }>('/api/recurring');
