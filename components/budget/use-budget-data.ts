import useSWR from 'swr';

export interface Budget {
  id: number;
  categoryId: number;
  categoryName: string;
  amount: number;
  year: number;
  month: number;
}

export const useBudgetData = (year: number | string, month: number | string) => {
  return useSWR<{ budgets: Budget[] }>(`/api/budgets?year=${year}&month=${month}`);
};
