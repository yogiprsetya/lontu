"use client";

import { signOut } from "next-auth/react";
import { useProfile } from "@/hooks/use-profile";
import { clearOfflineCaches, clearOfflineData } from "@/lib/offline/clear";
import { outbox } from "@/lib/offline/outbox";
import { useUIStore } from "@/stores/ui";

export async function signOutToLogin(userId?: string) {
  // Cached balances and transactions stay readable offline, so they must not outlive the session.
  await (userId ? clearOfflineData(userId) : clearOfflineCaches());
  return signOut({ redirectTo: "/login" });
}

/** Signs out right away, or first asks to confirm when unsent transactions would be discarded. */
export function useSignOut() {
  const userId = useProfile().data?.id;
  const open = useUIStore((s) => s.open);

  return async () => {
    const count = userId ? (await outbox.list(userId)).length : 0;
    if (count > 0) open("signOut", { userId, count });
    else await signOutToLogin(userId);
  };
}
