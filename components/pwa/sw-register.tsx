'use client';

import { useEffect } from 'react';

export const SwRegister = () => {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline support is progressive enhancement; ignore registration failures.
    });
  }, []);

  return null;
};
