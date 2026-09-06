'use client';

import { SessionProvider, signOut as nextAuthSignOut } from 'next-auth/react';
import { clearOfflineCache } from '~/utils/offline-cache';

export const signOutAndClearOfflineCache: typeof nextAuthSignOut = async (...args) => {
  await clearOfflineCache();

  return nextAuthSignOut(...args);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <SessionProvider>{children}</SessionProvider>;
};
