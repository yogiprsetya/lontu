'use client';

import { SWRConfig } from 'swr';

const fetcher = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Request failed');
  }

  return response.json();
};

export const SwrProvider = ({ children }: { children: React.ReactNode }) => {
  return <SWRConfig value={{ fetcher, revalidateOnFocus: false }}>{children}</SWRConfig>;
};
