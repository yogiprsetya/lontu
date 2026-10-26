"use client";

import { useSyncExternalStore } from "react";

export const onlineStore = {
  subscribe(onChange: () => void) {
    window.addEventListener("online", onChange);
    window.addEventListener("offline", onChange);
    return () => {
      window.removeEventListener("online", onChange);
      window.removeEventListener("offline", onChange);
    };
  },
  getSnapshot: () => navigator.onLine,
  getServerSnapshot: () => true,
};

export function useOnlineStatus(): boolean {
  return useSyncExternalStore(onlineStore.subscribe, onlineStore.getSnapshot, onlineStore.getServerSnapshot);
}
