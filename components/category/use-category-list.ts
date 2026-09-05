'use client';

import useSWR from 'swr';

interface Category {
  id: number;
  name: string;
  color: string | null;
  isArchived: number;
}

export const useCategoryList = () => {
  const result = useSWR<{ categories: Category[] }>('/api/categories');

  return {
    ...result,
    categories: result.data?.categories?.filter((category) => category.isArchived === 0) ?? [],
  };
};
