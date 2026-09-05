import useSWR from 'swr';

import type { ExpenseListItem } from './expense-list';

const useExpenseList = () => {
  return useSWR<{ expenses: ExpenseListItem[] }>('/api/expenses');
};

export default useExpenseList;
