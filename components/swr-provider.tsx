'use client';

import { useState } from 'react';
import { SWRConfig, type SWRConfiguration } from 'swr';
import { swrFetcher } from '~/config/http-client';
import { OFFLINE_STORAGE_KEY } from '~/utils/offline-cache';

const createOfflineProvider = (): SWRConfiguration['provider'] => () => {
  if (typeof window === 'undefined') {
    return new Map();
  }

  let persisted: Array<[string, unknown]> = [];

  try {
    const raw = localStorage.getItem(OFFLINE_STORAGE_KEY);

    if (raw) {
      persisted = JSON.parse(raw) as Array<[string, unknown]>;
    }
  } catch {
    persisted = [];
  }

  const map = new Map<string, unknown>(persisted);

  const persist = () => {
    try {
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify([...map.entries()]));
    } catch {
      // Ignore quota/private-mode errors; in-memory cache still works.
    }
  };

  const originalSet = map.set.bind(map);
  const originalDelete = map.delete.bind(map);
  const originalClear = map.clear.bind(map);

  map.set = ((key: string, value: unknown) => {
    const result = originalSet(key, value);
    persist();

    return result;
  }) as typeof map.set;

  map.delete = ((key: string) => {
    const result = originalDelete(key);
    persist();

    return result;
  }) as typeof map.delete;

  map.clear = (() => {
    originalClear();
    persist();
  }) as typeof map.clear;

  return map as Map<unknown, unknown>;
};

export const SwrProvider = ({ children }: { children: React.ReactNode }) => {
  const [provider] = useState(createOfflineProvider);

  return (
    <SWRConfig
      value={{
        fetcher: swrFetcher,
        provider,
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
      }}
    >
      {children}
    </SWRConfig>
  );
};
