"use client";

import { useSyncExternalStore } from "react";

// Many components read this at once; they share one online/offline listener pair.
const subscribers = new Set<() => void>();
const notify = () => subscribers.forEach((onChange) => onChange());

export const onlineStore = {
  subscribe(onChange: () => void) {
    if (subscribers.size === 0) {
      window.addEventListener("online", notify);
      window.addEventListener("offline", notify);
    }
    subscribers.add(onChange);
    return () => {
      subscribers.delete(onChange);
      if (subscribers.size === 0) {
        window.removeEventListener("online", notify);
        window.removeEventListener("offline", notify);
      }
    };
  },
  getSnapshot: () => navigator.onLine,
  getServerSnapshot: () => true,
};

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    onlineStore.subscribe,
    onlineStore.getSnapshot,
    onlineStore.getServerSnapshot,
  );
}
