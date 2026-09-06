'use client';

import { SWRConfig } from 'swr';
import { swrFetcher } from '~/config/http-client';

export const SwrProvider = ({ children }: { children: React.ReactNode }) => {
  return <SWRConfig value={{ fetcher: swrFetcher, revalidateOnFocus: false }}>{children}</SWRConfig>;
};
