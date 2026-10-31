"use client";

import { useMemo, useSyncExternalStore } from "react";

type Watcher = { mql: MediaQueryList; notify: () => void; subscribers: Set<() => void> };

// One `change` listener per query, shared by every component watching it.
const watchers = new Map<string, Watcher>();

function watch(query: string): Watcher {
  const existing = watchers.get(query);
  if (existing) return existing;
  const subscribers = new Set<() => void>();
  const watcher = {
    mql: window.matchMedia(query),
    notify: () => subscribers.forEach((onChange) => onChange()),
    subscribers,
  };
  watcher.mql.addEventListener("change", watcher.notify);
  watchers.set(query, watcher);
  return watcher;
}

export function createMediaQueryStore(query: string) {
  return {
    subscribe(onChange: () => void) {
      const { mql, notify, subscribers } = watch(query);
      subscribers.add(onChange);
      return () => {
        subscribers.delete(onChange);
        if (subscribers.size === 0) {
          mql.removeEventListener("change", notify);
          watchers.delete(query);
        }
      };
    },
    getSnapshot: () => window.matchMedia(query).matches,
    // Mobile-first: the server cannot know the viewport, so it renders the non-matching variant.
    getServerSnapshot: () => false,
  };
}

export function useMediaQuery(query: string): boolean {
  const store = useMemo(() => createMediaQueryStore(query), [query]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
