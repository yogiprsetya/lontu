import useSWR from 'swr';
import type { ExpenseListItem } from './expense-list';

export const useExpenseList = () => {
  return useSWR<{ expenses: ExpenseListItem[] }>('/api/expenses');
};
